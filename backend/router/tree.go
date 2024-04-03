package router

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/go-ping/ping"
	g "github.com/gosnmp/gosnmp"
	"log"
	"strconv"
	"strings"
	"switch_tree/database"
	"switch_tree/utils"
	"time"
)

func handlerGetTree(c *gin.Context) {
	mapSwitches := make(map[string]database.Switch)

	err := database.GetTree(mapSwitches)
	if err != nil {
		log.Println(err)
		c.JSON(400, nil)
		c.Abort()
		return
	}

	c.JSON(200, mapSwitches)
}

func handlerCheckPassword(c *gin.Context) {
	var password string
	err := c.BindJSON(&password)
	if err != nil {
		utils.Logger.Println(err)
		log.Println(err)
		c.JSON(400, false)
		c.Abort()
		return
	}

	if password == config.AdminPassword {
		var encryptPassword string

		encryptPassword, err = utils.Encrypt(password)
		if err != nil {
			utils.Logger.Println(err)
			log.Println(err)
			c.JSON(400, false)
			c.Abort()
			return
		}

		c.JSON(200, encryptPassword)

	} else {
		c.JSON(200, false)
	}

	c.Abort()
}

func handlerCreateRootSwitch(c *gin.Context) {
	var _switch database.Switch
	err := c.BindJSON(&_switch)
	if err != nil {
		utils.Logger.Println(err)
		log.Println(err)
		c.JSON(400, false)
		c.Abort()
		return
	}

	err = _switch.GetMac()
	if err != nil {
		utils.Logger.Println(err)
		log.Println(err)
		c.JSON(400, false)
		c.Abort()
		return
	}

	foundSwitch, exist := aliases.Mac[_switch.Mac]
	if !exist {
		if err != nil {
			utils.Logger.Println(err)
			log.Println(err)
			c.JSON(400, false)
			c.Abort()
			return
		}
	}

	_switch.Name = foundSwitch.Comment
	_switch.IsRoot = true

	err = _switch.Create()
	if err != nil {
		utils.Logger.Println(err)
		log.Println(err)
		c.JSON(400, false)
		c.Abort()
		return
	}

	c.JSON(200, true)
}

func handlerBuildTree(c *gin.Context) {
	rootSwitches, err := database.GetRootSwitches()
	if err != nil {
		log.Println(err)
		c.JSON(400, false)
		c.Abort()
		return
	}

	mainSwitches := make(map[string]database.Switch)

	for _, _switch := range rootSwitches {
		mainSwitches[_switch.Mac] = _switch
	}

	err = database.ClearSwitchTable()

	mapSwitches := make(map[string]database.Switch)

	for _, _switch := range mainSwitches {

		fmt.Println("start")

		mapSwitches[_switch.Mac] = _switch

		err = getLLDPNeighbors(_switch, mapSwitches, mainSwitches)
		if err != nil {
			return
		}
	}

	c.JSON(200, mapSwitches)
}

func getLLDPNeighbors(_switch database.Switch, mapSwitches map[string]database.Switch, mainSwitches map[string]database.Switch) error {
	g.Default.Target = _switch.IPAddress
	g.Default.Community = _switch.Community

	err := g.Default.Connect()
	if err != nil {
		utils.Logger.Println(err)
		log.Println(err)
		return err
	}
	defer g.Default.Conn.Close()

	oid := "1.0.8802.1.1.2.1.4.1.1.5"

	result, err := g.Default.BulkWalkAll(oid)
	if err != nil {
		utils.Logger.Println(_switch.IPAddress, err)
		log.Println(_switch.IPAddress, err)
		return err
	}

	for _, variable := range result {
		macElArr := variable.Value.([]byte)

		if len(macElArr) == 6 {
			var mac string

			for _, el := range macElArr {
				var hexEl string
				if el < 16 {
					hexEl = "0"
				}

				hexEl += strconv.FormatInt(int64(el), 16)

				if hexEl == "0" {
					hexEl = "00"
				}

				mac += hexEl + ":"
			}

			mac = mac[:17]

			_, isMainSwitch := mainSwitches[mac]

			if _switch.Parent != nil && mac == _switch.Parent.Mac || isMainSwitch {
				continue
			}

			foundSwitch, exist := aliases.Mac[mac]
			_, alreadyExist := mapSwitches[mac]

			if exist && !alreadyExist {
				var community string

				if strings.Contains(strings.ToLower(foundSwitch.Comment), "eltex mes") {
					community = "eltexstat"
				} else if strings.Contains(strings.ToLower(foundSwitch.Comment), "link") {
					community = "dlinkstat"
				} else {
					continue
				}

				neighbor := database.Switch{
					IPAddress: foundSwitch.IPAddress,
					Community: community,
					Name:      foundSwitch.Comment,
					Mac:       mac,
					Parent:    &_switch,
				}

				err = neighbor.Create()
				if err != nil {
					log.Println(err)
					return err
				}

				mapSwitches[mac] = neighbor

				if mac != "68:13:e2:88:03:00" {
					err = getLLDPNeighbors(neighbor, mapSwitches, mainSwitches)
					if err != nil {
						log.Println(err)
						return err
					}
				}
			} else {
				fmt.Println("неизвестный мак-адрес: ", mac)
			}
		}
	}

	return nil
}

func handlerPingSwitches(c *gin.Context) {
	mapSwitches := make(map[string]database.Switch)

	err := database.GetTree(mapSwitches)
	if err != nil {
		log.Println(err)
		c.JSON(400, nil)
		c.Abort()
		return
	}

	for key, _switch := range mapSwitches {
		_switch.NotPing = pingSwitch(_switch.IPAddress)
		mapSwitches[key] = _switch
	}

	c.JSON(200, mapSwitches)
}

func pingSwitch(ip string) bool {
	pinger, err := ping.NewPinger(ip)
	if err != nil {
		fmt.Printf("Error creating pinger: %s\n", err.Error())
		return true
	}

	pinger.Count = 1
	pinger.Timeout = time.Second * 2

	pinger.OnRecv = func(pkt *ping.Packet) {
		fmt.Printf("Received ping response from %s: RTT=%v\n", pkt.IPAddr, pkt.Rtt)
	}

	notPing := false
	pinger.OnFinish = func(stats *ping.Statistics) {
		fmt.Printf("Ping statistics for %s: %d packets transmitted, %d packets received, %v%% packet loss\n",
			stats.Addr, stats.PacketsSent, stats.PacketsRecv, stats.PacketLoss)
		if stats.PacketsRecv == 0 {
			notPing = true
		}
	}

	fmt.Printf("Pinging %s...\n", ip)
	err = pinger.Run()
	if err != nil {
		fmt.Printf("Error while pinging %s: %s\n", ip, err.Error())
		return true
	}

	return notPing
}
