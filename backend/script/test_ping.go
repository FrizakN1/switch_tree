package main

import (
	"fmt"
	"github.com/go-ping/ping"
	"time"
)

func main() {
	ip := "172.24.254.50"

	pinger, err := ping.NewPinger(ip)
	if err != nil {
		fmt.Printf("Error creating pinger: %s\n", err.Error())
	}

	pinger.Count = 1
	pinger.Timeout = time.Second * 2

	pinger.OnRecv = func(pkt *ping.Packet) {
		fmt.Printf("Received ping response from %s: RTT=%v\n", pkt.IPAddr, pkt.Rtt)
	}

	pinger.OnFinish = func(stats *ping.Statistics) {
		fmt.Printf("Ping statistics for %s: %d packets transmitted, %d packets received, %v%% packet loss\n",
			stats.Addr, stats.PacketsSent, stats.PacketsRecv, stats.PacketLoss)
	}

	fmt.Printf("Pinging %s...\n", ip)
	err = pinger.Run()
	if err != nil {
		fmt.Printf("Error while pinging %s: %s\n", ip, err.Error())
	}
}
