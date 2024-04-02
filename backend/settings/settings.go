package settings

import (
	"encoding/json"
	"fmt"
	"switch_tree/utils"
)

type Setting struct {
	Address       string
	Port          string
	DbHost        string
	DbPort        string
	DbUser        string
	DbPass        string
	DbName        string
	AllowOrigin   string
	AdminPassword string
}

var settings Setting

func Load(filename string) *Setting {
	bytes, e := utils.LoadFile(filename)
	if e != nil {
		fmt.Println(e)
		utils.Logger.Println(e)
		return nil
	}
	e = json.Unmarshal(bytes, &settings)
	if e != nil {
		fmt.Println(e)
		utils.Logger.Println(e)
		return nil
	}
	return &settings
}
