// Package bpmn — генерация BPMN 2.0 XML с диаграммами (DI) для редактора bpmn-js.
// Диаграммы описывают сквозные процессы ИСУП «в нужных разрезах» (требование 4.1.5);
// фронтенд открывает их в open-source редакторе bpmn-js, правки можно сохранить.
package bpmn

import (
	"fmt"
	"strings"
)

// node — элемент процесса с координатой для автогенерации DI.
type node struct {
	id   string
	name string
	kind string // startEvent | endEvent | userTask | serviceTask | task | exclusiveGateway
	x, y int
	w, h int
}

// edge — поток управления; cond — подпись условия на шлюзе.
type edge struct {
	from, to string
	cond     string
	back     bool // обратный поток (рисуется снизу)
}

type diagram struct {
	key  string
	name string
	nodes []node
	edges []edge
}

// Diagrams — доступные разрезы.
func Diagrams() []struct{ Key, Name, Description string } {
	return []struct{ Key, Name, Description string}{
		{"cr-approval", "Согласование запроса на изменение", "Черновик → согласование → утверждение → новая версия базового плана"},
		{"purchase", "Закупка: от заявки до поставки", "Заявка → заказ → договор → поставка; задержка запускает пересчёт каскада"},
		{"presale", "Пресейл: от лида до проекта", "Воронка этапов до закрытия; выигрыш создаёт проект с переносом данных"},
	}
}

// Generate — BPMN XML по ключу разреза.
func Generate(key string) (string, bool) {
	d, ok := defs[key]
	if !ok {
		return "", false
	}
	return d.xml(), true
}

var defs = map[string]*diagram{
	"cr-approval": crApproval(),
	"purchase":    purchaseFlow(),
	"presale":     presaleFlow(),
}

func (d *diagram) xml() string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_` + d.key + `" targetNamespace="http://bpmn.io/schema/bpmn">` + "\n")
	fmt.Fprintf(&b, `  <bpmn:process id="Process_%s" name="%s" isExecutable="false">`+"\n", d.key, d.name)

	nodeByID := map[string]node{}
	for _, n := range d.nodes {
		nodeByID[n.id] = n
	}
	incoming := map[string][]string{}
	outgoing := map[string][]string{}
	for _, e := range d.edges {
		outgoing[e.from] = append(outgoing[e.from], "Flow_"+e.from+"_"+e.to)
		incoming[e.to] = append(incoming[e.to], "Flow_"+e.from+"_"+e.to)
	}
	iod := func(id string) string {
		var s string
		for _, f := range incoming[id] {
			s += fmt.Sprintf("<bpmn:incoming>%s</bpmn:incoming>", f)
		}
		for _, f := range outgoing[id] {
			s += fmt.Sprintf("<bpmn:outgoing>%s</bpmn:outgoing>", f)
		}
		return s
	}

	for _, n := range d.nodes {
		switch n.kind {
		case "startEvent":
			fmt.Fprintf(&b, `    <bpmn:startEvent id="%s" name="%s">%s</bpmn:startEvent>`+"\n", n.id, n.name, iod(n.id))
		case "endEvent":
			fmt.Fprintf(&b, `    <bpmn:endEvent id="%s" name="%s">%s</bpmn:endEvent>`+"\n", n.id, n.name, iod(n.id))
		case "exclusiveGateway":
			fmt.Fprintf(&b, `    <bpmn:exclusiveGateway id="%s" name="%s">%s</bpmn:exclusiveGateway>`+"\n", n.id, n.name, iod(n.id))
		case "userTask":
			fmt.Fprintf(&b, `    <bpmn:userTask id="%s" name="%s">%s</bpmn:userTask>`+"\n", n.id, n.name, iod(n.id))
		case "serviceTask":
			fmt.Fprintf(&b, `    <bpmn:serviceTask id="%s" name="%s">%s</bpmn:serviceTask>`+"\n", n.id, n.name, iod(n.id))
		default:
			fmt.Fprintf(&b, `    <bpmn:task id="%s" name="%s">%s</bpmn:task>`+"\n", n.id, n.name, iod(n.id))
		}
	}
	for _, e := range d.edges {
		fid := "Flow_" + e.from + "_" + e.to
		cond := ""
		if e.cond != "" {
			cond = fmt.Sprintf(`<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><![CDATA[%s]]></bpmn:conditionExpression>`, e.cond)
		}
		fmt.Fprintf(&b, `    <bpmn:sequenceFlow id="%s" sourceRef="%s" targetRef="%s" name="%s">%s%s</bpmn:sequenceFlow>`+"\n",
			fid, e.from, e.to, e.cond, cond, "")
	}
	b.WriteString("  </bpmn:process>\n")

	// Диаграмма (DI) — координаты узлов и рёбер.
	fmt.Fprintf(&b, `  <bpmndi:BPMNDiagram id="Diagram_%s">`+"\n", d.key)
	fmt.Fprintf(&b, `    <bpmndi:BPMNPlane id="Plane_%s" bpmnElement="Process_%s">`+"\n", d.key, d.key)
	for _, n := range d.nodes {
		fmt.Fprintf(&b, `      <bpmndi:BPMNShape id="%s_di" bpmnElement="%s"><dc:Bounds x="%d" y="%d" width="%d" height="%d"/></bpmndi:BPMNShape>`+"\n",
			n.id, n.id, n.x, n.y, n.w, n.h)
	}
	for _, e := range d.edges {
		from, to := nodeByID[e.from], nodeByID[e.to]
		var wps []string
		if e.back {
			// Обратный поток: из нижней грани вниз, влево и обратно вверх.
			midY := max(from.y+from.h, to.y+to.h) + 46
			wps = []string{
				fmt.Sprintf(`<di:waypoint x="%d" y="%d"/>`, from.x+from.w/2, from.y+from.h),
				fmt.Sprintf(`<di:waypoint x="%d" y="%d"/>`, from.x+from.w/2, midY),
				fmt.Sprintf(`<di:waypoint x="%d" y="%d"/>`, to.x+to.w/2, midY),
				fmt.Sprintf(`<di:waypoint x="%d" y="%d"/>`, to.x+to.w/2, to.y+to.h),
			}
		} else {
			wps = []string{
				fmt.Sprintf(`<di:waypoint x="%d" y="%d"/>`, from.x+from.w, from.y+from.h/2),
				fmt.Sprintf(`<di:waypoint x="%d" y="%d"/>`, to.x, to.y+to.h/2),
			}
		}
		fmt.Fprintf(&b, `      <bpmndi:BPMNEdge id="Flow_%s_%s_di" bpmnElement="Flow_%s_%s">%s</bpmndi:BPMNEdge>`+"\n",
			e.from, e.to, e.from, e.to, strings.Join(wps, ""))
	}
	b.WriteString("    </bpmndi:BPMNPlane>\n")
	b.WriteString("  </bpmndi:BPMNDiagram>\n")
	b.WriteString("</bpmn:definitions>\n")
	return b.String()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// ============ Разрез 1: согласование ЗИ (Ф33–Ф34) ============

func crApproval() *diagram {
	return &diagram{
		key:  "cr-approval",
		name: "Согласование запроса на изменение",
		nodes: []node{
			{id: "S1", kind: "startEvent", name: "Изменение обнаружено", x: 150, y: 200, w: 36, h: 36},
			{id: "T1", kind: "userTask", name: "Черновик ЗИ: причина и описание", x: 240, y: 178, w: 140, h: 80},
			{id: "T2", kind: "userTask", name: "Расчёт влияния движком (GM, ДДС)", x: 430, y: 178, w: 150, h: 80},
			{id: "T3", kind: "userTask", name: "На согласовании (директор)", x: 630, y: 178, w: 140, h: 80},
			{id: "G1", kind: "exclusiveGateway", name: "Утверждён?", x: 820, y: 193, w: 50, h: 50},
			{id: "T4", kind: "serviceTask", name: "Новая версия базового плана v(N+1)", x: 920, y: 178, w: 160, h: 80},
			{id: "T5", kind: "serviceTask", name: "Пересчёт сроков, финансов и лента событий", x: 920, y: 320, w: 160, h: 80},
			{id: "E1", kind: "endEvent", name: "План обновлён", x: 1140, y: 340, w: 36, h: 36},
			{id: "T6", kind: "userTask", name: "Доработка черновика", x: 430, y: 330, w: 140, h: 70},
		},
		edges: []edge{
			{from: "S1", to: "T1"},
			{from: "T1", to: "T2"},
			{from: "T2", to: "T3"},
			{from: "T3", to: "G1"},
			{from: "G1", to: "T4", cond: "Да"},
			{from: "T4", to: "T5"},
			{from: "T5", to: "E1"},
			{from: "G1", to: "T6", cond: "Нет", back: true},
			{from: "T6", to: "T1", back: true},
		},
	}
}

// ============ Разрез 2: закупка (Ф27–Ф29) ============

func purchaseFlow() *diagram {
	return &diagram{
		key:  "purchase",
		name: "Закупка: от заявки до поставки",
		nodes: []node{
			{id: "S1", kind: "startEvent", name: "Заявка из проекта", x: 150, y: 200, w: 36, h: 36},
			{id: "T1", kind: "userTask", name: "Закупка создана (З-ГГГГ-NNN)", x: 240, y: 178, w: 150, h: 80},
			{id: "T2", kind: "userTask", name: "Заказ размещён", x: 440, y: 178, w: 120, h: 80},
			{id: "T3", kind: "userTask", name: "Договор подписан", x: 610, y: 178, w: 120, h: 80},
			{id: "G1", kind: "exclusiveGateway", name: "Поставка в срок?", x: 780, y: 193, w: 50, h: 50},
			{id: "T4", kind: "serviceTask", name: "Получено; факт в бюджет", x: 880, y: 178, w: 140, h: 80},
			{id: "T5", kind: "serviceTask", name: "Пересчёт каскада: вехи, выручка, ДДС", x: 880, y: 330, w: 160, h: 80},
			{id: "T6", kind: "userTask", name: "Риск и запрос на изменение", x: 660, y: 345, w: 150, h: 70},
			{id: "E1", kind: "endEvent", name: "Закрыто", x: 1080, y: 200, w: 36, h: 36},
			{id: "E2", kind: "endEvent", name: "План скорректирован", x: 1090, y: 352, w: 36, h: 36},
		},
		edges: []edge{
			{from: "S1", to: "T1"},
			{from: "T1", to: "T2"},
			{from: "T2", to: "T3"},
			{from: "T3", to: "G1"},
			{from: "G1", to: "T4", cond: "Да"},
			{from: "T4", to: "E1"},
			{from: "G1", to: "T5", cond: "Задержка"},
			{from: "T5", to: "T6"},
			{from: "T6", to: "E2"},
		},
	}
}

// ============ Разрез 3: пресейл → проект (Ф1–Ф6) ============

func presaleFlow() *diagram {
	return &diagram{
		key:  "presale",
		name: "Пресейл: от лида до проекта",
		nodes: []node{
			{id: "S1", kind: "startEvent", name: "Лид", x: 150, y: 200, w: 36, h: 36},
			{id: "T1", kind: "userTask", name: "Первичный контакт (15%)", x: 240, y: 178, w: 150, h: 70},
			{id: "T2", kind: "userTask", name: "Переговоры (40%)", x: 440, y: 178, w: 130, h: 70},
			{id: "T3", kind: "userTask", name: "ТКП / Тендер", x: 620, y: 178, w: 120, h: 70},
			{id: "T4", kind: "userTask", name: "Закрытие (90%)", x: 790, y: 178, w: 120, h: 70},
			{id: "G1", kind: "exclusiveGateway", name: "Выигрыш?", x: 960, y: 193, w: 50, h: 50},
			{id: "T5", kind: "serviceTask", name: "Создание проекта PRJ-ГГГГ-NNN (перенос данных)", x: 900, y: 320, w: 190, h: 80},
			{id: "E1", kind: "endEvent", name: "Проект в работе", x: 1150, y: 342, w: 36, h: 36},
			{id: "E2", kind: "endEvent", name: "Проигрыш", x: 970, y: 90, w: 36, h: 36},
		},
		edges: []edge{
			{from: "S1", to: "T1"},
			{from: "T1", to: "T2"},
			{from: "T2", to: "T3"},
			{from: "T3", to: "T4"},
			{from: "T4", to: "G1"},
			{from: "G1", to: "T5", cond: "Да"},
			{from: "T5", to: "E1"},
			{from: "G1", to: "E2", cond: "Нет"},
		},
	}
}
