// Сервер ИСУП — точка входа. Запуск: PORT=8080 go run ./cmd/server
// Хранение в PostgreSQL включается переменной ISUP_DB_DSN
// (docker compose задаёт её автоматически, сервис db).
// Без ISUP_DB_DSN сервер работает в памяти процесса (локальная разработка, тесты).
package main

import (
	"log"
	"net/http"
	"os"

	"isup/internal/api"
	"isup/internal/pg"
	"isup/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	var database *pg.DB
	var st *store.Store
	if dsn := os.Getenv("ISUP_DB_DSN"); dsn != "" {
		var err error
		database, err = pg.Open(dsn)
		if err != nil {
			log.Fatalf("PostgreSQL недоступен (%s): %v", dsn, err)
		}
		defer database.Close()
		if err := database.EnsureSchema(); err != nil {
			log.Fatalf("PostgreSQL: создание схемы: %v", err)
		}
		has, err := database.HasData()
		if err != nil {
			log.Fatalf("PostgreSQL: чтение: %v", err)
		}
		if has {
			// Состояние загружается из БД — переживает рестарты контейнеров.
			st = store.NewEmpty()
			if err := database.LoadInto(st); err != nil {
				log.Fatalf("PostgreSQL: загрузка состояния: %v", err)
			}
			// БД, созданная до появления состава работ/новых справочников, дозаполняется сидами.
			if n := st.EnsureSeededRefs(); n > 0 {
				if err := database.Sync(st); err != nil {
					log.Fatalf("PostgreSQL: дозасев справочников: %v", err)
				}
				log.Printf("Справочники дозаполнены (%d позиций)", n)
			}
			log.Printf("Состояние загружено из PostgreSQL: %d проектов, %d пресейлов",
				len(st.Projects), len(st.Presales))
		} else {
			// Первичный запуск: демо-данные прогружаются в БД.
			st = store.New()
			if err := database.Sync(st); err != nil {
				log.Fatalf("PostgreSQL: запись демо-данных: %v", err)
			}
			log.Printf("Демо-данные загружены в PostgreSQL: %d проектов, %d пресейлов",
				len(st.Projects), len(st.Presales))
		}
	} else {
		st = store.New()
		log.Println("ISUP_DB_DSN не задан — состояние живёт в памяти процесса")
	}

	srv := api.New(st, database)
	srv.StartupCheck()
	log.Printf("ИСУП API запущен: http://localhost:%s/api/portfolio", port)
	if err := http.ListenAndServe(":"+port, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
