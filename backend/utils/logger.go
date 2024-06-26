package utils

import (
	"fmt"
	"log"
	"os"
	"time"
)

var Logger *log.Logger

func init() {
	currentDate := time.Now().String()[0:10]

	loggerFile, e := os.OpenFile("logs/"+currentDate+".log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0644)
	if e != nil {
		fmt.Println(e)
		return
	}

	Logger = log.New(loggerFile, "", log.Ldate|log.Ltime|log.Lshortfile)
}
