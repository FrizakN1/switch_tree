package router

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"switch_tree/database"
	"switch_tree/settings"
	"switch_tree/utils"
)

var aliases database.Aliases
var config settings.Setting

func Initialization(_config *settings.Setting) *gin.Engine {
	config = *_config

	router := gin.Default()

	bytes, e := utils.LoadFile("./aliases.json")
	if e != nil {
		log.Println(e)
		return nil
	}
	e = json.Unmarshal(bytes, &aliases)
	if e != nil {
		log.Println(e)
		return nil
	}

	router.Use(func(c *gin.Context) {
		allowedOrigin := config.AllowOrigin

		origin := c.Request.Header.Get("Origin")

		var isAllowedOrigin bool
		if allowedOrigin == origin {
			isAllowedOrigin = true
		}

		if isAllowedOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Password")

			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(http.StatusOK)
			} else {
				c.Next()
			}
		} else {
			c.AbortWithStatus(http.StatusUnauthorized)
		}
	})

	routerTree := router.Group("/switches_tree")

	routerTree.POST("/check_password", handlerCheckPassword)
	routerTree.GET("/get_tree", handlerGetTree)

	routerTree.Use(authMiddleware())

	//routerTree.GET("/get_tree", handlerGetTree)
	routerTree.POST("/create_root_switch", handlerCreateRootSwitch)
	routerTree.GET("/build_tree", handlerBuildTree)

	return router
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		password := c.GetHeader("Password")
		if password == "" {
			fmt.Println("Не обнаружен заголовок авторизации")
			c.JSON(401, gin.H{"error": "Не обнаружен заголовок авторизации"})
			c.Abort()
			return
		}

		encryptPassword, err := utils.Encrypt(config.AdminPassword)
		if err != nil {
			c.JSON(400, false)
			c.Abort()
			return
		}

		if encryptPassword == password {
			c.Next()
		} else {
			c.JSON(401, gin.H{"error": "Неверный пароль"})
			c.Abort()
			return
		}
	}
}
