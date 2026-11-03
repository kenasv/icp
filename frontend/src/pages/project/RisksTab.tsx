import { Card, Table, Tag, Typography, Tooltip } from 'antd'
import type { ProjectCard, Risk } from '../../types'
import { fmtDate } from '../../format'

// Риски (Ф30–Ф31): карта рисков и матрица 3×3 с фиксированными шкалами.
const PROBS = ['низкая', 'средняя', 'высокая']
const IMPACTS = ['низкое', 'среднее', 'высокое']

function level(p: string, i: string): number {
  return (PROBS.indexOf(p) + 1) * (IMPACTS.indexOf(i) + 1)
}

function levelColor(lvl: number): string {
  if (lvl >= 6) return '#ffccc7'
  if (lvl >= 3) return '#ffe58f'
  return '#d9f7be'
}

function levelEmoji(lvl: number): string {
  if (lvl >= 6) return '🔴'
  if (lvl >= 3) return '🟡'
  return '🟢'
}

export default function RisksTab({ data }: { data: ProjectCard }) {
  const risks = data.project.risks

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Card size="small" title="Матрица рисков 3×3 (Ф31)" style={{ flexGrow: 1, flexBasis: 460, maxWidth: '100%' }}>
        <div className="risk-matrix">
          <div />
          {IMPACTS.map((i) => (
            <Typography.Text key={i} type="secondary" style={{ textAlign: 'center', fontSize: 12 }}>
              {i}
            </Typography.Text>
          ))}
          {[...PROBS].reverse().map((p) => (
            <>
              <Typography.Text type="secondary" style={{ writingMode: 'vertical-rl', fontSize: 12, textAlign: 'center' }}>
                {p}
              </Typography.Text>
              {IMPACTS.map((i) => {
                const cellRisks = risks.filter((r) => r.probability === p && r.impact === i && r.status === 'открыт')
                return (
                  <div
                    key={p + i}
                    style={{
                      background: levelColor(level(p, i)),
                      borderRadius: 6,
                      minHeight: 74,
                      padding: 6,
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    {cellRisks.map((r) => (
                      <Tooltip key={r.id} title={`${r.name} — ${r.probability}/${r.impact}, ответственный указан в реестре`}>
                        <div
                          style={{
                            background: '#fff', borderRadius: 4, padding: '2px 6px', marginBottom: 3,
                            fontSize: 11, cursor: 'default', border: '1px solid rgba(0,0,0,0.1)',
                          }}
                        >
                          {levelEmoji(level(p, i))} {r.name.length > 24 ? r.name.slice(0, 22) + '…' : r.name}
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                )
              })}
            </>
          ))}
        </div>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Уровень = вероятность × влияние: 🔴 ≥ 6, 🟡 3–4, 🟢 ≤ 2. Шкалы фиксированы.
        </Typography.Paragraph>
      </Card>

      <Card size="small" title="Карта рисков (Ф30)" style={{ flexGrow: 2, flexBasis: 420, maxWidth: '100%' }}>
        <Table<Risk>
          rowKey="id"
          size="small"
          dataSource={risks}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Риски не зарегистрированы' }}
          columns={[
            { title: 'Риск', dataIndex: 'name' },
            { title: 'Вероятность', dataIndex: 'probability', width: 120 },
            { title: 'Влияние', dataIndex: 'impact', width: 110 },
            {
              title: 'Уровень', width: 90, align: 'center' as const,
              render: (_: any, r) => <span style={{ fontSize: 16 }}>{levelEmoji(level(r.probability, r.impact))}</span>,
            },
            { title: 'Ответственный', dataIndex: 'owner', width: 150,
              render: (id: string) => data.team.find((t) => t.employeeId === id)?.name ?? id },
            { title: 'Срок', dataIndex: 'dueDate', width: 110, render: (v: string) => fmtDate(v) },
            { title: 'Статус', dataIndex: 'status', width: 100, render: (s: string) => <Tag color={s === 'открыт' ? 'red' : 'green'}>{s}</Tag> },
          ]}
        />
      </Card>
    </div>
  )
}
