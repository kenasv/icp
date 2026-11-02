import { useEffect, useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tabs, Tag, Tooltip, Typography, Spin } from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined, FunnelPlotOutlined, ProjectOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { api } from '../api'
import type { Portfolio } from '../types'
import { fmtMoney, fmtPct, fmtMonth, fmtMonthShort, zoneEmoji, zoneColor } from '../format'
import { useRole } from '../App'
import { useNavigate } from 'react-router-dom'

// Портфельный дашборд директора (Ф36–Ф37): план/прогноз/факт по выручке,
// GM портфеля (взвешенно по выручке), ДДС по месяцам, взвешенная воронка пресейлов.
export default function Dashboard() {
  const [data, setData] = useState<Portfolio | null>(null)
  const [err, setErr] = useState('')
  const { role } = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    api.portfolio().then(setData).catch((e) => setErr(e.message))
  }, [])

  if (err) return <Card>Ошибка загрузки: {err}</Card>
  if (!data) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  const m = data.metrics
  const ddsData = data.dds.map((d) => ({
    month: fmtMonthShort(d.month),
    'Входящие (план)': +d.in.plan.toFixed(2),
    'Исходящие (план)': +d.out.plan.toFixed(2),
    'Входящие (прогноз)': +d.in.forecast.toFixed(2),
    'Исходящие (прогноз)': +d.out.forecast.toFixed(2),
    'Разрыв (план)': +d.gap.plan.toFixed(2),
    'Разрыв (прогноз)': +d.gap.forecast.toFixed(2),
  }))

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Портфельный дашборд «{data.name}»
        <Typography.Text type="secondary" style={{ fontSize: 14, marginLeft: 12 }}>
          Директор департамента: {data.director} · все показатели — выход расчётного движка
        </Typography.Text>
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Выручка портфеля (активные проекты)"
              value={fmtMoney(m.revenueForecast)}
              prefix={<ProjectOutlined />}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              план {fmtMoney(m.revenueForecast === m.revenuePlan ? m.revenuePlan : m.revenuePlan)} ·
              факт {fmtMoney(m.revenueActual)}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="GM портфеля (взвешенно по выручке)"
              value={`${fmtPct(m.gmForecast)} прогноз`}
              suffix={<span style={{ fontSize: 13, color: '#888' }}> / {fmtPct(m.gmPlan)} план</span>}
              prefix={m.gmForecast >= m.gmPlan ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Взвешенная выручка пресейлов (воронка)"
              value={fmtMoney(m.weightedPresales)}
              prefix={<FunnelPlotOutlined />}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              активных пресейлов: {data.funnel.totalCount}
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Проектов в портфеле" value={data.projects.length} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              в реализации: {data.projects.filter((p) => p.status === 'В реализации').length} ·
              проблемных: {data.projects.filter((p) => p.health !== 'green' && p.status !== 'Завершён').length}
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card size="small" title="ДДС портфеля по месяцам, млн ₽ (кассовый разрыв = исходящие − входящие)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ddsData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RTooltip formatter={(v: any) => `${v} млн ₽`} />
                <Legend />
                <Bar dataKey="Входящие (прогноз)" fill="#52c41a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Исходящие (прогноз)" fill="#2f54eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Разрыв (прогноз)" fill="#ff4d4f" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="Здоровье портфеля">
            {data.projects.map((p) => (
              <Tooltip key={p.id} title={p.healthReason}>
                <div
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                  }}
                >
                  <span>{zoneEmoji(p.health)} {p.name}</span>
                  <span style={{ color: zoneColor(p.health), fontSize: 12 }}>
                    {p.devDays ? `+${p.devDays} дн.` : 'по плану'}
                  </span>
                </div>
              </Tooltip>
            ))}
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'projects',
              label: 'Проекты',
              children: (
                <Table<ProjectSummary2>
                  rowKey="id"
                  size="small"
                  dataSource={data.projects as any}
                  onRow={(r) => ({ onClick: () => navigate(`/projects/${r.id}`), style: { cursor: 'pointer' } })}
                  pagination={false}
                  columns={[
                    { title: 'Номер', dataIndex: 'id', width: 120 },
                    { title: 'Название', dataIndex: 'name' },
                    { title: 'Клиент', dataIndex: 'clientName', width: 160 },
                    { title: 'Статус', dataIndex: 'status', width: 130,
                      render: (s: string) => <Tag color={s === 'В реализации' ? 'processing' : s === 'Планирование' ? 'default' : 'success'}>{s}</Tag> },
                    { title: 'Сумма, млн ₽', dataIndex: 'amount', align: 'right' as const, width: 110,
                      render: (v: number) => v.toFixed(1).replace('.', ',') },
                    { title: 'GM план', dataIndex: 'gmPlan', align: 'right' as const, width: 90, render: (v: number) => fmtPct(v, 0) },
                    { title: 'GM прогноз', dataIndex: 'gmForecast', align: 'right' as const, width: 100, render: (v: number) => fmtPct(v, 0) },
                    {
                      title: 'Здоровье', dataIndex: 'health', width: 110,
                      render: (z: any, r: any) => (
                        <Tooltip title={r.healthReason}><span>{zoneEmoji(z)} {r.devDays > 0 ? `+${r.devDays} дн.` : ''}</span></Tooltip>
                      ),
                    },
                    { title: 'Дополнение', dataIndex: 'note', width: 230, ellipsis: true },
                  ]}
                />
              ),
            },
            {
              key: 'presales',
              label: 'Пресейлы (сводка воронки)',
              children: (
                <div>
                  <Row gutter={[16, 16]}>
                    {data.funnel.stages.map((st) => (
                      <Col key={st.stageId} xs={24} sm={12} md={8} lg={4} xl={4}>
                        <Card size="small" style={{ background: '#fafbff' }}>
                          <Statistic title={`${st.name} · ${Math.round(st.probability * 100)}%`} value={st.count} suffix="шт." />
                          <Typography.Text style={{ fontSize: 12 }}>сумма {fmtMoney(st.sum, 0)}</Typography.Text>
                          <br />
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            взвешенная {fmtMoney(st.weighted)}
                          </Typography.Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
                    Конверсии между этапами:{' '}
                    {data.funnel.conversions.map((c) => (
                      <Tag key={c.from + c.to}>{c.from} → {c.to}: {Math.round(c.rate * 100)}%</Tag>
                    ))}
                  </Typography.Paragraph>
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
        Роль: {role === 'director' ? 'директор департамента' : 'РП'}. Данные плана/прогноза/факта рассчитываются движком;
        факт — модуль-заглушка «OEBS-факт» (последняя синхронизация указана в карточке проекта).
      </Typography.Paragraph>
    </div>
  )
}

type ProjectSummary2 = any
