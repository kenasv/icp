// Package c4 — генерация архитектурных специфик в нотации C4 (требование 4.1.5):
// Mermaid-диаграммы (рендерятся фронтендом) и Structurizr DSL (текст для выгрузки).
// Описание соответствует фактической структуре системы.
package c4

import "strings"

// Spec — набор представлений архитектуры.
type Spec struct {
	MermaidContext   string `json:"mermaidContext"`
	MermaidContainer string `json:"mermaidContainer"`
	StructurizrDSL   string `json:"structurizrDsl"`
}

// Generate — сборка C4-спеки.
func Generate() Spec {
	return Spec{
		MermaidContext:   mermaidContext(),
		MermaidContainer: mermaidContainer(),
		StructurizrDSL:   structurizrDSL(),
	}
}

func mermaidContext() string {
	return `C4Context
title ИСУП — контекстная диаграмма (C4, уровень 1)

Person(rp, "РП", "Руководитель проекта: карточка проекта, песочница, запросы на изменение")
Person(dir, "Директор департамента", "Портфельный дашборд и аналитика")

System(isup, "ИСУП", "Управленческий контур проекта: пресейл, сроки, финансы, риски, ресурсы")
System_Ext(oebs, "OEBS (модуль-заглушка)", "Фактические выручка и затраты, метка последней синхронизации")
System_Ext(ai, "ИИ-провайдер (интерфейс)", "В пилоте подключается полная модель, сейчас DemoProvider на правилах")

Rel(dir, isup, "Портфельная аналитика, согласование ЗИ")
Rel(rp, isup, "Ведение проектов, what-if сценарии")
Rel(isup, oebs, "Получение факта (заглушка)")
Rel(isup, ai, "Вопросы, рекомендации, статус-отчёты")

`
}

func mermaidContainer() string {
	return `C4Container
title ИСУП — диаграмма контейнеров (C4, уровень 2)

Container_Boundary(isup, "ИСУП") {
  Container(web, "Web-интерфейс", "React + Ant Design", "Воронка, карточка проекта, Гант, финансы, песочница, ИИ-панель")
  Container(api, "API-бэкенд", "Go (net/http)", "REST API, сборка срезов проекта и портфеля")
  Container(engine, "Расчётный движок", "Go", "Каскад сроков (FS+лаг), финансы, ДДС, GM, здоровье, сценарии")
  ContainerDb(store, "In-memory хранилище", "Go", "Демо-данные портфеля «Цифровизация B2B», persistence не требуется")
  Container(bpmnbox, "BPMN-модуль", "bpmn-js + генератор XML", "Просмотр и правка процессов ИСУП")
  Container(aibox, "ИИ-модуль", "Интерфейс Provider + DemoProvider", "Чат, отклонения, статус-отчёты, точка подключения LLM")
}

Rel(web, api, "REST /api/*", "JSON")
Rel(api, engine, "Пересчёт и метрики")
Rel(api, store, "Чтение/запись доменных объектов")
Rel(engine, store, "Каскадный пересчёт графика и финансов")
Rel(web, aibox, "Вопросы и отчёты (через API)")
Rel(api, aibox, "Provider.Chat / StatusReport / Recommendations")

`
}

func structurizrDSL() string {
	var b strings.Builder
	b.WriteString("// Structurizr DSL — спецификация ИСУП в нотации C4\n")
	b.WriteString("workspace \"ИСУП\" \"Управленческий контур проекта\" {\n")
	b.WriteString("  model {\n")
	b.WriteString("    rp = person \"РП\" \"Руководитель проекта\"\n")
	b.WriteString("    dir = person \"Директор департамента\" \"Портфельный дашборд\"\n")
	b.WriteString("    isup = softwareSystem \"ИСУП\" \"Пресейл, проекты, финансы, риски, ресурсы\" {\n")
	b.WriteString("      web = container \"Web-интерфейс\" \"React\" \"Воронка, Гант, песочница\"\n")
	b.WriteString("      api = container \"API-бэкенд\" \"Go\" \"REST API\"\n")
	b.WriteString("      engine = container \"Расчётный движок\" \"Go\" \"Сроки, финансы, ДДС, здоровье\"\n")
	b.WriteString("      store = container \"Хранилище\" \"In-memory\" \"Демо-данные\"\n")
	b.WriteString("      ai = container \"ИИ-модуль\" \"Provider + DemoProvider\" \"Точка подключения модели\"\n")
	b.WriteString("    }\n")
	b.WriteString("    oebs = softwareSystem \"OEBS\" \"Факт выручки/затрат (заглушка)\"\n")
	b.WriteString("    rp -> isup \"Ведение проектов\"\n")
	b.WriteString("    dir -> isup \"Аналитика, согласование ЗИ\"\n")
	b.WriteString("    isup -> oebs \"Факт (заглушка)\"\n")
	b.WriteString("  }\n")
	b.WriteString("  views {\n")
	b.WriteString("    systemContext isup \"Context\" \"Контекст ИСУП\"\n")
	b.WriteString("    container isup \"Containers\" \"Контейнеры ИСУП\"\n")
	b.WriteString("    styles { element \"Person\" { background #08427b; color #ffffff } }\n")
	b.WriteString("  }\n")
	b.WriteString("}\n")
	return b.String()
}
