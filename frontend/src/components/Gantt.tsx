import { useMemo, useState } from 'react'
import { Popover, Typography, Tag } from 'antd'
import type { WBSRow } from '../types'
import { fmtDate, fmtDateShort, fmtMoney, fmtMonth } from '../format'

// Диаграмма Ганта (Ф14): этапы, работы, вехи, длительности, зависимости «финиш-старт».
// Сравнение с базовым планом (Ф18): сдвинутые элементы подсвечиваются красным
// с отклонением в днях. Наведение на веху — карточка привязок (Ф16).

const ROW_H = 38
const HEAD_H = 40
const DAY_W = 3.6 // пикселей на день

interface Props {
  rows: WBSRow[]
  from: Date
  to: Date
}

export default function Gantt({ rows, from, to }: Props) {
  const [highlight, setHighlight] = useState<string | null>(null) // ключ связи from->to

  const totalDays = Math.max(1, (to.getTime() - from.getTime()) / 86400000)
  const width = totalDays * DAY_W
  const height = HEAD_H + rows.length * ROW_H

  const x = (d: Date) => (d.getTime() - from.getTime()) / 86400000 * DAY_W

  const months = useMemo(() => {
    const out: { label: string; x: number; w: number }[] = []
    const d = new Date(from.getFullYear(), from.getMonth(), 1)
    while (d <= to) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const sx = Math.max(0, x(d))
      const ex = Math.min(width, x(next))
      out.push({ label: fmtMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`), x: sx, w: ex - sx })
      d.setMonth(d.getMonth() + 1)
    }
    return out
  }, [from, to, width])

  const rowY = (i: number) => HEAD_H + i * ROW_H + ROW_H / 2

  const byId = useMemo(() => {
    const m: Record<string, { row: WBSRow; i: number }> = {}
    rows.forEach((r, i) => (m[r.id] = { row: r, i }))
    return m
  }, [rows])

  // Ортогональная линия зависимости: финиш предшественника → старт последователя.
  const depPath = (fromRow: WBSRow, fi: number, toRow: WBSRow, ti: number) => {
    const x1 = x(new Date(fromRow.end)) + (fromRow.type === 'milestone' ? 0 : 0)
    const y1 = rowY(fi)
    const x2 = x(new Date(toRow.start))
    const y2 = rowY(ti)
    const midX = x2 - 10
    return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        {/* Левая колонка: названия элементов СДР (ширина — .gantt-left в index.css) */}
        <div className="gantt-left" style={{ borderRight: '1px solid #eee' }}>
          <div className="gantt-left-title" style={{ height: HEAD_H, borderBottom: '1px solid #eee', padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>
            СДР (этапы / работы / вехи)
          </div>
          {rows.map((r) => (
            <div
              key={r.id}
              style={{
                height: ROW_H, display: 'flex', alignItems: 'center', gap: 6,
                paddingLeft: 12 + (r.type === 'phase' ? 0 : 16),
                borderBottom: '1px solid #f7f7f7', fontSize: 13,
                fontWeight: r.type === 'phase' ? 600 : 400,
                background: r.type === 'phase' ? '#fafbff' : undefined,
              }}
            >
              {r.type === 'phase' && '▸ '}
              {r.type === 'milestone' && '◆ '}
              {r.type === 'work' && '▪ '}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              {r.devDays !== 0 && (
                <span style={{ color: '#cf1322', fontSize: 11, whiteSpace: 'nowrap' }}>+{r.devDays}д</span>
              )}
            </div>
          ))}
        </div>
        {/* Область диаграммы */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <svg width={width} height={height} className="gantt-grid">
            {/* Сетка месяцев */}
            {months.map((m) => (
              <g key={m.label}>
                <line x1={m.x} y1={0} x2={m.x} y2={height} className="gantt-month-line" />
                <text x={m.x + 6} y={24} fontSize={12} fill="#666">{m.label}</text>
              </g>
            ))}
            {/* Строки */}
            {rows.map((r, i) => (
              <line key={'bg' + r.id} x1={0} y1={rowY(i) + ROW_H / 2} x2={width} y2={rowY(i) + ROW_H / 2} stroke="#f7f7f7" />
            ))}

            {/* Зависимости (Ф15: финиш-старт с лагом) */}
            {rows.map((r, ti) =>
              (r.dependencies || []).map((dep) => {
                const p = byId[dep.fromId]
                if (!p) return null
                const key = `${dep.fromId}->${r.id}`
                const isHi = highlight === key || highlight === r.id || highlight === dep.fromId
                return (
                  <path
                    key={key}
                    d={depPath(p.row, p.i, r, ti)}
                    className={`gantt-dep-line${isHi ? ' highlighted' : ''}`}
                    onClick={() => setHighlight(highlight === key ? null : key)}
                    style={{ cursor: 'pointer' }}
                  />
                )
              }),
            )}

            {/* Элементы СДР */}
            {rows.map((r, i) => {
              const y = rowY(i)
              const shifted = r.devDays !== 0 && r.hasBase
              const color = shifted ? '#cf1322' : r.type === 'phase' ? '#597ef7' : '#2f54eb'
              const content = (
                <g>
                  {r.type === 'phase' && (
                    <>
                      <rect x={x(new Date(r.start))} y={y - 9} width={Math.max(4, x(new Date(r.end)) - x(new Date(r.start)))} height={7} rx={3} fill={color} opacity={0.85} />
                      <line x1={x(new Date(r.start))} y1={y - 4} x2={x(new Date(r.start))} y2={y + 4} stroke={color} />
                      <line x1={x(new Date(r.end))} y1={y - 4} x2={x(new Date(r.end))} y2={y + 4} stroke={color} />
                    </>
                  )}
                  {r.type === 'work' && (
                    <>
                      {/* Базовый план (призрак) */}
                      {r.hasBase && (
                        <rect
                          x={x(new Date(r.baseStart))}
                          y={y - 3}
                          width={Math.max(3, x(new Date(r.baseEnd)) - x(new Date(r.baseStart)))}
                          height={6}
                          rx={2}
                          fill="none"
                          stroke="#bfbfbf"
                          strokeDasharray="3 2"
                        />
                      )}
                      <rect
                        x={x(new Date(r.start))}
                        y={y - 9}
                        width={Math.max(4, x(new Date(r.end)) - x(new Date(r.start)))}
                        height={14}
                        rx={4}
                        fill={color}
                        onClick={() => setHighlight(highlight === r.id ? null : r.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <text x={x(new Date(r.start)) + 4} y={y - 13} fontSize={10} fill="#666">
                        {fmtDateShort(r.start)}–{fmtDateShort(r.end)}
                      </text>
                    </>
                  )}
                  {r.type === 'milestone' && (
                    <>
                      {r.hasBase && r.devDays !== 0 && (
                        <path
                          d={diamond(x(new Date(r.baseStart)), y - 10, 5)}
                          fill="#fff" stroke="#bfbfbf" strokeDasharray="2 2"
                        />
                      )}
                      <path
                        d={diamond(x(new Date(r.start)), y, 8)}
                        fill={shifted ? '#cf1322' : '#faad14'}
                        stroke="#fff"
                        strokeWidth={1.5}
                        onClick={() => setHighlight(highlight === r.id ? null : r.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <text x={x(new Date(r.start)) + 12} y={y + 4} fontSize={11} fill={shifted ? '#cf1322' : '#8c8c8c'}>
                        {fmtDateShort(r.start)}
                        {shifted ? ` (+${r.devDays}д)` : ''}
                      </text>
                    </>
                  )}
                </g>
              )

              // Наведение на веху — карточка привязок (Ф16).
              if (r.type === 'milestone' && (r.purchase || (r.budgetLinks && r.budgetLinks.length))) {
                return (
                  <Popover key={r.id} trigger="hover" placement="top" content={<MilestonePopover row={r} />}>
                    <g>{content}</g>
                  </Popover>
                )
              }
              return <g key={r.id}>{content}</g>
            })}
          </svg>
        </div>
      </div>
      <div style={{ padding: '6px 12px', fontSize: 12, color: '#888', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
        ◆ веха · ▪ работа · ▸ этап · пунктир — базовый план · красным — сдвиг от базового плана · клик по связи/элементу — подсветка зависимости
      </div>
    </div>
  )
}

function diamond(cx: number, cy: number, r: number): string {
  return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`
}

// Карточка привязок вехи (Ф16): закупка и статьи выручки.
function MilestonePopover({ row }: { row: WBSRow }) {
  return (
    <div style={{ maxWidth: 360 }}>
      <Typography.Text strong>{row.name}</Typography.Text>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 6 }}>
        Прогноз: {fmtDate(row.start)}
        {row.hasBase && row.devDays !== 0 && <span style={{ color: '#cf1322' }}> (план {fmtDate(row.baseStart)}, +{row.devDays} дн.)</span>}
      </Typography.Paragraph>
      {row.purchase && (
        <div style={{ marginBottom: 6 }}>
          <Tag color="blue">Закупка</Tag>{' '}
          <Typography.Text style={{ fontSize: 12 }}>
            {row.purchase.number} «{row.purchase.name}» · {row.purchase.supplier} · {fmtMoney(row.purchase.amount, 1)} ·{' '}
            {row.purchase.status} · план {fmtDate(row.purchase.planDate)} / прогноз {fmtDate(row.purchase.forecastDate)}
          </Typography.Text>
        </div>
      )}
      {(row.budgetLinks || []).map((b) => (
        <div key={b.id} style={{ marginBottom: 4 }}>
          <Tag color={b.isRevenue ? 'green' : 'orange'}>{b.article}</Tag>{' '}
          <Typography.Text style={{ fontSize: 12 }}>
            {fmtMoney(b.planSum, 1)} · план: {fmtMonth(b.planMonth)}
            {b.forecastMonth && b.forecastMonth !== b.planMonth && (
              <span style={{ color: '#cf1322' }}> → прогноз: {fmtMonth(b.forecastMonth)}</span>
            )}
          </Typography.Text>
        </div>
      ))}
    </div>
  )
}
