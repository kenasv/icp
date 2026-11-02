import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Tag, Timeline, Typography, Button, Alert, Tooltip, Select, message } from 'antd'
import { CopyOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ProjectCard } from '../../types'
import { api } from '../../api'
import { fmtDate, fmtMoney, fmtPct, fmtSignedDays, zoneEmoji, zoneColor } from '../../format'
import type { Insight } from '../../types'

const EVENT_COLORS: Record<string, string> = {
  'статус': 'blue',
  'согласование': 'geekblue',
  'изменение': 'orange',
  'риск': 'volcano',
  'отклонение': 'red',
  'комментарий ИИ': 'purple',
}

// Обзор: здоровье по трём показателям (Ф32), ключевые цифры, ИИ-наблюдения (Ф39),
// статус-отчёт с кнопкой «Скопировать» (Ф40) и лента событий (Ф11).
export default function OverviewTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const { project, computed } = data
  const [report, setReport] = useState('')
  const [insights, setInsights] = useState<Insight[]>([])
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    api.aiRecommendations(project.id).then(setInsights).catch(() => {})
  }, [project.id])

  const genReport = async () => {
    setLoadingReport(true)
    try {
      const { report } = await api.aiStatusReport(project.id)
      setReport(report)
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setLoadingReport(false)
    }
  }

  const copyReport = async () => {
    await navigator.clipboard.writeText(report)
    message.success('Статус-отчёт скопирован в буфер обмена')
  }

  const h = computed.health
  const events = [...project.events].sort((a, b) => +new Date(b.at) - +new Date(a.at))

  const statusFlow = ['Планирование', 'В реализации', 'Завершён', 'Архив']

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={15}>
        <Card size="small" title="Здоровье проекта (расчёт по формулам, Ф32)" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {[
              { name: 'Сроки', part: h.schedule, value: h.schedule.devDays != null ? fmtSignedDays(h.schedule.devDays) : '—' },
              { name: 'Выручка', part: h.revenue, value: h.revenue.devPct != null ? `${h.revenue.devPct.toFixed(1).replace('.', ',')}%` : '—' },
              { name: 'GM', part: h.gm, value: h.gm.devPp != null ? `${h.gm.devPp.toFixed(1).replace('.', ',')} п.п.` : '—' },
            ].map((m) => (
              <Col xs={24} sm={8} key={m.name}>
                <Card size="small" style={{ borderColor: zoneColor(m.part.zone), borderWidth: 2 }}>
                  <Statistic
                    title={<span>{zoneEmoji(m.part.zone)} {m.name}</span>}
                    value={m.value}
                    valueStyle={{ color: zoneColor(m.part.zone), fontSize: 20 }}
                  />
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>{m.part.reason}</Typography.Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
          <Typography.Paragraph type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>
            Пороги: сроки 🟢 ≤7 дн. / 🟡 ≤30; выручка 🟢 ≤5% / 🟡 ≤15%; GM 🟢 ≤2 п.п. / 🟡 ≤5 п.п.
          </Typography.Paragraph>
        </Card>

        <Card size="small" title="ИИ-наблюдения и рекомендации (Ф39)" style={{ marginBottom: 16 }}>
          {insights.map((ins, i) => (
            <Alert
              key={i}
              type={ins.severity === 'critical' ? 'error' : ins.severity === 'warning' ? 'warning' : 'success'}
              showIcon
              message={ins.text}
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>

        <Card
          size="small"
          title="Черновик статус-отчёта (ИИ, Ф40)"
          extra={
            <>
              <Button size="small" icon={<FileTextOutlined />} loading={loadingReport} onClick={genReport}>
                Сгенерировать
              </Button>
              {report && (
                <Button size="small" type="primary" ghost icon={<CopyOutlined />} onClick={copyReport} style={{ marginLeft: 8 }}>
                  Скопировать
                </Button>
              )}
            </>
          }
        >
          {report ? (
            <pre className="report-text">{report}</pre>
          ) : (
            <Typography.Text type="secondary">
              Отчёт собирается из ленты событий, рисков и запросов на изменение: статус, здоровье, ключевое событие, влияние, принятые меры, следующие шаги.
            </Typography.Text>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={9}>
        <Card size="small" title="Лента здоровья проекта (Ф11)" style={{ marginBottom: 16 }}>
          <Timeline
            items={events.map((e) => ({
              color: EVENT_COLORS[e.type] || 'gray',
              children: (
                <div className={e.type === 'комментарий ИИ' ? 'event-ai' : ''}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {fmtDate(e.at)} · {e.type}{e.author ? ` · ${e.author}` : ''}
                  </Typography.Text>
                  <div>{e.text}</div>
                </div>
              ),
            }))}
          />
        </Card>

        <Card size="small" title="Статус жизненного цикла (Ф8)">
          <Select
            value={project.status}
            style={{ width: '100%' }}
            onChange={async (v) => {
              await api.patchProject(project.id, { status: v })
              message.success(`Статус изменён: ${v}`)
              reload()
            }}
            options={statusFlow.map((s) => ({ value: s, label: s }))}
          />
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
            Планирование → В реализации → Завершён → Архив
          </Typography.Paragraph>
        </Card>
      </Col>
    </Row>
  )
}
