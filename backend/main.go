package main

import (
	"switch_tree/database"
	"switch_tree/router"
	"switch_tree/settings"
)

func main() {
	config := settings.Load("settings/settings.json")

	database.Connection(config)

	_ = router.Initialization(config).Run(config.Address + ":" + config.Port)
}
