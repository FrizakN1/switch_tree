package database

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/go-ping/ping"
	g "github.com/gosnmp/gosnmp"
	"log"
	"strconv"
	"switch_tree/utils"
	"time"
)

type Switch struct {
	ID        int
	Name      string
	IPAddress string
	Mac       string
	Parent    *Switch
	Community string
	IsRoot    bool
	NotPing   bool
}

type Aliases struct {
	Mac map[string]Mac `json:"aliases"`
}

type Mac struct {
	IPAddress string `json:"IPAddress"`
	Comment   string `json:"Comment"`
}

var query map[string]*sql.Stmt

func prepareTree() []string {
	errorList := make([]string, 0)
	var err error
	if query == nil {
		query = make(map[string]*sql.Stmt)
	}

	query["GET_ALL_SWITCHES"], err = Link.Prepare(`
		SELECT * FROM "Switch"
	`)
	if err != nil {
		errorList = append(errorList, err.Error())
	}

	query["GET_ROOT_SWITCHES"], err = Link.Prepare(`
		SELECT * FROM "Switch" WHERE is_root = true
	`)
	if err != nil {
		errorList = append(errorList, err.Error())
	}

	query["CREATE_SWITCH"], err = Link.Prepare(`
		INSERT INTO "Switch"(name, parent_id, ip_address, mac, community, is_root) 
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
	`)
	if err != nil {
		errorList = append(errorList, err.Error())
	}

	query["CLEAR_SWITCH_TABLE"], err = Link.Prepare(`
		DELETE FROM "Switch" WHERE is_root = false
	`)
	if err != nil {
		errorList = append(errorList, err.Error())
	}

	return errorList
}

func GetTree(mapSwitches map[string]Switch) error {
	stmt, ok := query["GET_ALL_SWITCHES"]
	if !ok {
		utils.Logger.Println("запрос не подготовлен")
		return errors.New("запрос не подготовлен")
	}

	rows, err := stmt.Query()
	if err != nil {
		utils.Logger.Println(err)
		return err
	}

	for rows.Next() {
		var _switch Switch
		var parentID sql.NullInt32
		err = rows.Scan(
			&_switch.ID,
			&_switch.Name,
			&parentID,
			&_switch.IPAddress,
			&_switch.Mac,
			&_switch.Community,
			&_switch.IsRoot,
		)
		if err != nil {
			utils.Logger.Println(err)
			return err
		}

		if parentID.Valid {
			_switch.Parent = &Switch{ID: int(parentID.Int32)}
		}

		_switch.NotPing = pingSwitch(_switch.IPAddress)

		mapSwitches[_switch.Mac] = _switch
	}

	return nil
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

func GetRootSwitches() ([]Switch, error) {
	stmt, ok := query["GET_ROOT_SWITCHES"]
	if !ok {
		utils.Logger.Println("запрос не подготовлен")
		return nil, errors.New("запрос не подготовлен")
	}

	rows, err := stmt.Query()
	if err != nil {
		utils.Logger.Println(err)
		return nil, err
	}

	var rootSwitches []Switch
	for rows.Next() {
		var rootSwitch Switch
		var parentID sql.NullInt32
		err = rows.Scan(
			&rootSwitch.ID,
			&rootSwitch.Name,
			&parentID,
			&rootSwitch.IPAddress,
			&rootSwitch.Mac,
			&rootSwitch.Community,
			&rootSwitch.IsRoot,
		)
		if err != nil {
			utils.Logger.Println(err)
			return nil, err
		}

		if parentID.Valid {
			rootSwitch.Parent = &Switch{ID: int(parentID.Int32)}
		}

		rootSwitches = append(rootSwitches, rootSwitch)
	}

	return rootSwitches, nil
}

func (_switch *Switch) Create() error {
	stmt, ok := query["CREATE_SWITCH"]
	if !ok {
		utils.Logger.Println("запрос не подготовлен")
		return errors.New("запрос не подготовлен")
	}

	var parentID interface{}

	parentID = nil
	if _switch.Parent != nil {
		parentID = _switch.Parent.ID
	}

	err := stmt.QueryRow(
		_switch.Name,
		parentID,
		_switch.IPAddress,
		_switch.Mac,
		_switch.Community,
		_switch.IsRoot,
	).Scan(&_switch.ID)
	if err != nil {
		utils.Logger.Println(err)
		return err
	}

	return nil
}

func (_switch *Switch) GetMac() error {
	g.Default.Target = _switch.IPAddress
	g.Default.Community = _switch.Community

	err := g.Default.Connect()
	if err != nil {
		utils.Logger.Println(err)
		log.Println(err)
		return err
	}
	defer g.Default.Conn.Close()

	var oid string

	if _switch.Community == "eltexstat" {
		oid = "1.3.6.1.4.1.89.53.4.1.7"
	} else if _switch.Community == "dlinkstat" {
		oid = "1.3.6.1.4.1.171.10.134.2.1.1.26.0"
	}

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

			_switch.Mac = mac[:17]
		}
	}

	return nil
}

func ClearSwitchTable() error {
	stmt, ok := query["CLEAR_SWITCH_TABLE"]
	if !ok {
		utils.Logger.Println("запрос не подготовлен")
		return errors.New("запрос не подготовлен")
	}

	_, err := stmt.Exec()
	if err != nil {
		utils.Logger.Println(err)
		return err
	}

	return nil
}
