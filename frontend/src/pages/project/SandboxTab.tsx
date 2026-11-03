import { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Input, Select, Button, Table, Tag, Typography, message, Space, Modal } from 'antd'
import { ExperimentOutlined, SaveOutlined, FileProtectOutlined } from '@ant-design/icons'
import type { ProjectCard, ScenarioComparison, ScenarioOp, Scenario } from '../../types'
import { api } from '../../api'
import { fmtDate, fmtMonth, fmtPct, zoneEmoji } from '../../format'

// What-if песочница (пояснение к требованиям): РП создаёт сценарий — сдвигает веху,
// меняет длительность, добавляет статью расхода. Сравнение трёх колонок:
// Базовый план / Текущий прогноз / Сценарий. Сценарий не меняет базовый план;
// из сценария создаётся ЗИ с автозаполнением.
export default function SandboxTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const { project } = data
  const milestones = data.computed.schedule.filter((r) => r.type === 'milestone')
  const works = data.computed.schedule.filter((r) => r.type === 'work')
  const months = data.computed.finance.months

  const [comparison, setComparison] = useState<ScenarioComparison | null>(null)
  const [saved, setSaved] = useState<Scenario | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [running, setRunning] = useState(false)

  const loadScenarios = () => api.scenarios(project.id).then(setScenarios)
  useEffect(() => { loadScenarios() }, [project.id])

  // Локальный конструктор операций сценария.
  const [ops, setOps] = useState<ScenarioOp[]>([])
  const [name, setName] = useState('')

  const addOp = (op: ScenarioOp) => setOps((o) => [...o, op])

  const run = async (save: boolean) => {
    if (ops.length === 0) {
      message.warning('Добавьте хотя бы одну операцию сценария')
      return
    }
    setRunning(true)
    try {
      const res = await api.createScenario(project.id, {
        name: name || `Сценарий ${scenarios.length + 1}`,
        ops,
        save,
      })
      setComparison(res.comparison)
      setSaved(res.scenario)
      if (save) {
        message.success('Сценарий сохранён (базовый план не изменён)')
        loadScenarios()
        reload()
      }
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setRunning(false)
    }
  }

  const toCR = async (sc: Scenario) => {
    try {
      const cr = await api.scenarioToCR(project.id, sc.id)
      message.success(`Создан запрос на изменение ${cr.id} с автозаполнением влияния`)
      reload()
    } catch (e: any) {
      message.error(e.message)
    }
  }

  const col = (title: string, c: ScenarioComparison['base'] | null, highlightCol?: boolean) => ({
    title,
    render: (_: any, row: any) => {
      if (!c) return '—'
      switch (row.kind) {
        case 'milestone': {
          const m = c.keyMilestones.find((k) => k.milestoneId === row.id)
          if (!m) return '—'
          const base = comparison?.base.keyMilestones.find((k) => k.milestoneId === row.id)
          const shifted = base && base.date !== m.date
          return <span style={shifted ? { color: '#cf1322', fontWeight: 600 } : undefined}>{fmtDate(m.date)}</span>
        }
        case 'gm':
          return <b>{fmtPct(c.gm, 1)}</b>
        case 'gap': {
          const g = c.cashGaps.find((x) => x.month === row.month)
          if (!g) return '—'
          return (
            <Tag color={g.gap > 0 ? 'red' : 'green'}>
              {g.gap > 0 ? '+' : ''}{g.gap.toFixed(1).replace('.', ',')}
            </Tag>
          )
        }
        case 'health':
          return <span style={{ fontSize: 16 }}>{zoneEmoji(c.health.overall)}</span>
        default:
          return '—'
      }
    },
  })

  const rows: any[] = [
    ...milestones.map((m) => ({ kind: 'milestone', id: m.id, key: m.id, name: `Веха: ${m.name}` })),
    { kind: 'gm', key: 'gm', name: 'GM (прогноз)' },
    ...months.map((m) => ({ kind: 'gap', key: 'gap' + m, month: m, name: `Кассовый разрыв: ${fmtMonth(m)}` })),
    { kind: 'health', key: 'health', name: 'Здоровье' },
  ]

  return (
    <div>
      <Card size="small" title={<span><ExperimentOutlined /> Конструктор сценария</span>} style={{ marginBottom: 16 }}>
        <Space wrap size={16}>
          <Input placeholder="Название сценария" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 'min(320px, calc(100vw - 48px))' }} />
          <Space.Compact>
            <Select
              placeholder="Сдвинуть веху…"
              style={{ width: 'min(260px, calc(100vw - 48px))' }}
              value={undefined}
              onSelect={(id: string) => {
                Modal.confirm({
                  title: 'Сдвиг вехи',
                  content: (
                    <InputNumber
                      id="shift-days"
                      defaultValue={7}
                      addonAfter="дн."
                      style={{ width: '100%', marginTop: 8 }}
                    />
                  ),
                  onOk: () => {
                    const input = document.getElementById('shift-days') as HTMLInputElement
                    const days = Number(input?.value || 7)
                    addOp({ kind: 'shiftMilestone', targetId: id, shiftDays: days })
                    message.success('Операция добавлена')
                  },
                })
              }}
              options={milestones.map((m) => ({ value: m.id, label: m.name }))}
            />
          </Space.Compact>
          <Select
            placeholder="Изменить длительность работы…"
            style={{ width: 'min(260px, calc(100vw - 48px))' }}
            value={undefined}
            onSelect={(id: string) => {
              Modal.confirm({
                title: 'Изменение длительности',
                content: (
                  <InputNumber id="dur-days" defaultValue={-7} addonAfter="дн." style={{ width: '100%', marginTop: 8 }} />
                ),
                onOk: () => {
                  const input = document.getElementById('dur-days') as HTMLInputElement
                  const days = Number(input?.value || -7)
                  addOp({ kind: 'shiftDuration', targetId: id, durationDelta: days })
                  message.success('Операция добавлена')
                },
              })
            }}
            options={works.map((w) => ({ value: w.id, label: w.name }))}
          />
          <Space.Compact>
            <Select
              placeholder="Статья расхода"
              style={{ width: 140 }}
              value={undefined}
              onSelect={(article: string) => {
                const amountInput = document.getElementById('cost-amount') as HTMLInputElement
                const monthSel = document.getElementById('cost-month') as HTMLSelectElement
                addOp({ kind: 'addCost', article, amount: Number(amountInput?.value || 1), month: monthSel?.value || months[0] })
                message.success('Операция добавлена')
              }}
              options={['Оборудование', 'Работы', 'Подряд', 'Прочее'].map((a) => ({ value: a, label: a }))}
            />
            <InputNumber id="cost-amount" defaultValue={1} min={0} step={0.5} addonAfter="млн ₽" style={{ width: 140 }} />
            <Select id="cost-month" defaultValue={months[Math.min(1, months.length - 1)]} style={{ width: 120 }}
              options={months.map((m) => ({ value: m, label: fmtMonth(m) }))} />
          </Space.Compact>
        </Space>

        {ops.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {ops.map((op, i) => (
              <Tag key={i} closable onClose={() => setOps((o) => o.filter((_, j) => j !== i))}>
                {op.kind === 'shiftMilestone' &&
                  `Веха ${milestones.find((m) => m.id === op.targetId)?.name}: ${op.shiftDays! > 0 ? '+' : ''}${op.shiftDays} дн.`}
                {op.kind === 'shiftDuration' &&
                  `Работа ${works.find((w) => w.id === op.targetId)?.name}: длительность ${op.durationDelta! > 0 ? '+' : ''}${op.durationDelta} дн.`}
                {op.kind === 'addCost' && `Добавить расход «${op.article}» ${op.amount} млн ₽ (${fmtMonth(op.month!)})`}
              </Tag>
            ))}
          </div>
        )}

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" loading={running} onClick={() => run(false)}>
            Рассчитать сравнение
          </Button>
          <Button icon={<SaveOutlined />} loading={running} onClick={() => run(true)}>
            Сохранить сценарий
          </Button>
        </Space>
      </Card>

      {comparison && (
        <Card size="small" title="Сравнение: базовый план / текущий прогноз / сценарий" style={{ marginBottom: 16 }}>
          <Table
            rowKey="key"
            size="small"
            dataSource={rows}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              { title: 'Показатель', dataIndex: 'name' },
              col('Базовый план', comparison.base),
              col('Текущий прогноз', comparison.current),
              col('Сценарий', comparison.scenario),
            ]}
          />
        </Card>
      )}

      <Card size="small" title="Сохранённые сценарии">
        <Table<Scenario>
          rowKey="id"
          size="small"
          dataSource={scenarios}
          pagination={false}
          scroll={{ x: 640 }}
          locale={{ emptyText: 'Сценариев пока нет' }}
          columns={[
            { title: 'Название', dataIndex: 'name' },
            { title: 'Операций', dataIndex: 'ops', width: 100, render: (o: any[]) => o?.length ?? 0 },
            {
              title: '', width: 320,
              render: (_: any, sc) => (
                <Space>
                  <Button size="small" onClick={async () => {
                    setOps(sc.ops)
                    setName(sc.name)
                    const res = await api.createScenario(project.id, { name: sc.name, ops: sc.ops, save: false })
                    setComparison(res.comparison)
                  }}>
                    Открыть в сравнении
                  </Button>
                  <Button size="small" type="primary" ghost icon={<FileProtectOutlined />} onClick={() => toCR(sc)}>
                    Создать ЗИ
                  </Button>
                </Space>
              ),
            },
          ]}
        />
        {saved && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            Последний сохранённый: «{saved.name}». Из сценария можно создать запрос на изменение —
            влияние (GM п.п., ДДС млн ₽) подставится автоматически.
          </Typography.Paragraph>
        )}
      </Card>
    </div>
  )
}
