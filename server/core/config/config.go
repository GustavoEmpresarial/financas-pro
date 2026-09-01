// Package config le a configuracao do ambiente.
//
// Os defaults sao identicos aos do backend legado (server/src/index.ts e
// server/src/app.ts) para que trocar de binario nao exija mexer no .env.
package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	Host        string
	UploadDir   string
	PublicDir   string
	LogLevel    string
}

// devSecret e o mesmo fallback inseguro do legado (lib/jwt.ts). Mantido para que
// tokens emitidos em dev continuem validos entre os dois backends, mas Load
// avisa em voz alta quando ele esta em uso.
const devSecret = "financaspro-dev-secret-change-me"

func Load() (*Config, error) {
	c := &Config{
		DatabaseURL: env("DATABASE_URL", ""),
		JWTSecret:   env("JWT_SECRET", devSecret),
		Port:        env("PORT", "9101"),
		Host:        env("HOST", "0.0.0.0"),
		UploadDir:   env("UPLOAD_DIR", "/uploads"),
		PublicDir:   env("PUBLIC_DIR", "./public"),
		LogLevel:    strings.ToLower(env("LOG_LEVEL", "info")),
	}
	if c.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL nao definida")
	}
	return c, nil
}

// UsingDevSecret informa se o JWT esta assinado com o segredo publico de
// desenvolvimento. bootstrap loga um aviso quando isso acontece.
func (c *Config) UsingDevSecret() bool { return c.JWTSecret == devSecret }

func (c *Config) Addr() string { return c.Host + ":" + c.Port }

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}
