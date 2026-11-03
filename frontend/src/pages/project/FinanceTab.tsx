import { Card, Table, Tag, Typography } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ProjectCard } from '../../types'
import { fmtMoney, fmtMonth, fmtMonthShort, fmtPct } from '../../format'

// Финансы и ДДС (Ф21–Ф26): бюджет по статьям с помесячной детализацией
// (план / прогноз / факт), GM и кассовый разрыв. Факт — модуль-заглушка OEBS (Ф23).
export default function FinanceTab({ data }: { data: ProjectCard }) {
  const f = data.computed.finance
  const months = f.months

  const cell = (m: Record<string, number> | undefined, key: string) => {
    const v = m?.[key] ?? 0
    return v === 0 ? <span style={{ color: '#ccc' }}>—</span> : v.toFixed(1).replace('.', ',')
  }

  const ddsData = f.dds.monthly.map((d) => ({
    month: fmtMonthShort(d.month),
    'Входящие (план)': +d.in.plan.toFixed(2),
    'Исходящие (план)': +d.out.plan.toFixed(2),
    'Входящие (прогноз)': +d.in.forecast.toFixed(2),
    'Исходящие (прогноз)': +d.out.forecast.toFixed(2),
    'Входящие (факт)': +d.in.actual.toFixed(2),
    'Исходящие (факт)': +d.out.actual.toFixed(2),
    'Разрыв (план)': +d.gap.plan.toFixed(2),
    'Разрыв (прогноз)': +d.gap.forecast.toFixed(2),
    'Разрыв (факт)': +d.gap.actual.toFixed(2),
  }))

  const gmData = f.gm.monthly.map((m) => ({
    month: fmtMonthShort(m.month),
    'GM план, %': +(m.plan * 100).toFixed(1),
    'GM прогноз, %': +(m.forecast * 100).toFixed(1),
    'GM факт, %': +(m.actual * 100).toFixed(1),
  }))

  return (
    <div>
      <Card size="small" title="Бюджет по статьям, помесячно (Ф21–Ф22)" style={{ marginBottom: 16 }}
        extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>Факт — OEBS-заглушка, синхронизация: {f.oebsSyncAt}</Typography.Text>}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={f.articles}
          columns={[
            {
              title: 'Статья', dataIndex: 'article', width: 140, fixed: 'left' as const,
              render: (a: string, r: any) => <Tag color={r.isRevenue ? 'green' : 'orange'}>{a}</Tag>,
            },
            ...(['plan', 'forecast', 'actual'] as const).flatMap((kind) => {
              const title = kind === 'plan' ? 'План' : kind === 'forecast' ? 'Прогноз' : 'Факт'
              return [
                ...months.map((m) => ({
                  title: `${fmtMonthShort(m)} · ${title}`,
                  width: 80,
                  align: 'right' as const,
                  render: (_: any, r: any) => cell(r[kind], m),
                })),
                {
                  title: `Итого ${title}`,
                  width: 100,
                  align: 'right' as const,
                  render: (_: any, r: any) => <b>{r.total[kind].toFixed(1).replace('.', ',')}</b>,
                },
              ]
            }),
          ]}
          scroll={{ x: 'max-content' }}
        />
        <Typography.Paragraph style={{ marginTop: 10, marginBottom: 0 }}>
          Выручка: план <b>{fmtMoney(f.revenue.total.plan)}</b> · прогноз <b>{fmtMoney(f.revenue.total.forecast)}</b> ·
          факт <b>{fmtMoney(f.revenue.total.actual)}</b>.
          Затраты: план <b>{fmtMoney(f.cost.total.plan)}</b> · прогноз <b>{fmtMoney(f.cost.total.forecast)}</b>.
          GM: план <b>{fmtPct(f.gm.plan, 1)}</b> · прогноз <b>{fmtPct(f.gm.forecast, 1)}</b> · факт <b>{fmtPct(f.gm.actual, 1)}</b> (Ф22).
        </Typography.Paragraph>
      </Card>

      <Card size="small" title="ДДС: входящие/исходящие потоки и кассовый разрыв (Ф24)" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={ddsData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <RTooltip formatter={(v: any) => `${v} млн ₽`} />
            <Legend />
            <Bar dataKey="Входящие (прогноз)" fill="#52c41a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Исходящие (прогноз)" fill="#2f54eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Разрыв (прогноз)" fill="#ff4d4f" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Входящие (факт)" fill="#95de64" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Исходящие (факт)" fill="#85a5ff" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <Table
          rowKey="month"
          size="small"
          style={{ marginTop: 12 }}
          pagination={false}
          dataSource={f.dds.monthly}
          scroll={{ x: 1050 }}
          columns={[
            { title: 'Месяц', dataIndex: 'month', width: 140, render: (m: string) => fmtMonth(m) },
            { title: 'Входящие (план)', dataIndex: ['in', 'plan'], align: 'right' as const, render: (v: number) => v.toFixed(1).replace('.', ',') },
            { title: 'Входящие (прогноз)', dataIndex: ['in', 'forecast'], align: 'right' as const, render: (v: number) => v.toFixed(1).replace('.', ',') },
            { title: 'Входящие (факт)', dataIndex: ['in', 'actual'], align: 'right' as const, render: (v: number) => v.toFixed(1).replace('.', ',') },
            { title: 'Исходящие (план)', dataIndex: ['out', 'plan'], align: 'right' as const, render: (v: number) => v.toFixed(1).replace('.', ',') },
            { title: 'Исходящие (прогноз)', dataIndex: ['out', 'forecast'], align: 'right' as const, render: (v: number) => v.toFixed(1).replace('.', ',') },
            { title: 'Исходящие (факт)', dataIndex: ['out', 'actual'], align: 'right' as const, render: (v: number) => v.toFixed(1).replace('.', ',') },
            {
              title: 'Кассовый разрыв = исходящие − входящие', width: 280,
              render: (_: any, r: any) => {
                const parts = [
                  { label: 'план', v: r.gap.plan },
                  { label: 'прогноз', v: r.gap.forecast },
                  { label: 'факт', v: r.gap.actual },
                ]
                return (
                  <span>
                    {parts.map((p) => (
                      <Tag key={p.label} color={p.v > 0 ? 'red' : p.v < 0 ? 'green' : 'default'}>
                        {p.label}: {p.v > 0 ? '+' : ''}{p.v.toFixed(1).replace('.', ',')}
                      </Tag>
                    ))}
                  </span>
                )
              },
            },
          ]}
        />
      </Card>

      <Card size="small" title="GM помесячно, % (план / прогноз / факт)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={gmData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis unit="%" />
            <RTooltip formatter={(v: any) => `${v}%`} />
            <Legend />
            <Bar dataKey="GM план, %" fill="#b7c4ff" radius={[3, 3, 0, 0]} />
            <Bar dataKey="GM прогноз, %" fill="#2f54eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="GM факт, %" fill="#52c41a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
