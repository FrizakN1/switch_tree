package utils

import (
	"crypto/sha256"
	"encoding/hex"
)

const encryptKey = "!S@perS!"

func Encrypt(value string) (string, error) {
	hash := sha256.New()
	_, err := hash.Write([]byte(value + encryptKey))
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}
