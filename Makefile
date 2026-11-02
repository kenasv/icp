# ИСУП — команды для локальной работы
# Полный запуск в Docker: make docker (фронтенд http://localhost:9081)

.PHONY: test backend frontend docker down

test:          ## Автотесты бэкенда (расчётный движок)
	cd backend && go test ./...

backend:       ## Запуск бэкенда локально (порт 8080)
	cd backend && go run ./cmd/server

frontend:      ## Запуск фронтенда в dev-режиме (порт 5173, прокси на :8080)
	cd frontend && npm run dev

docker:        ## Сборка и запуск всего стека в Docker
	docker compose up --build -d

down:          ## Останов стека
	docker compose down
