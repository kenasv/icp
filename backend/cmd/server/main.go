// Сервер ИСУП — точка входа. Запуск: PORT=8080 go run ./cmd/server
package main

import (
	"log"
	"net/http"
	"os"

	"isup/internal/api"
	"isup/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	st := store.New()
	srv := api.New(st)
	srv.StartupCheck()
	log.Printf("ИСУП API запущен: http://localhost:%s/api/portfolio", port)
	if err := http.ListenAndServe(":"+port, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
