# Сборка Go-бэкенда ИСУП (многоступенчатая; зависимость — pgx для PostgreSQL).
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -o /isup-server ./cmd/server

FROM alpine:3.20
COPY --from=build /isup-server /isup-server
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/isup-server"]
