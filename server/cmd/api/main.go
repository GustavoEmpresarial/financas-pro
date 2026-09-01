// Comando api: o servidor HTTP do FinancasPro.
//
// Nao tem logica propria. Todo o trabalho esta em server/bootstrap; aqui so
// existe porque um binario Go precisa de um package main.
package main

import (
	"context"
	"fmt"
	"os"

	"financaspro/server/bootstrap"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "erro fatal:", err)
		os.Exit(1)
	}
}

func run() error {
	app, closeApp, err := bootstrap.New(context.Background())
	if err != nil {
		return err
	}
	defer closeApp()
	return app.Serve()
}
