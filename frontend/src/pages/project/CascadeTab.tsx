import { Card, Table, Tag, Typography, Alert } from 'antd'
import type { ProjectCard } from '../../types'
import { fmtDate, fmtMoney, fmtMonth } from '../../format'

// Экран «Каскад последствий» (демо-кейс): сравнение базового плана и текущего
// прогноза по срокам (Ф18), финансам (Ф26) и закупкам (Ф29). Все числа — движок.
export default function CascadeTab({ data }: { data: ProjectCard }) {
  const c = data.computed.cascade
  const shiftedRows = c.rows.filter((r) => r.shifted && r.devDays !== 0)
  const shiftedFinance = c.financeShifts.filter((f) => f.shiftMonths !== 0)

  return (
    <div>
      {shiftedRows.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Отклонения от базового плана v${c.baselineVersion}: сдвинуты ${shiftedRows.length} элемент(ов) СДР, ${shiftedFinance.length} финансовых привязок переносятся на другие месяцы.`}
        />
      )}
      <Card size="small" title={`Сроки: базовый план v${c.baselineVersion} против прогноза (Ф18)`} style={{ marginBottom: 16 }}>
        <Table
          rowKey="itemId"
          size="small"
          dataSource={c.rows}
          pagination={false}
          columns={[
            {
              title: 'Тип', dataIndex: 'type', width: 90,
              render: (t: string) => (t === 'milestone' ? <Tag color="gold">веха</Tag> : <Tag color="blue">работа</Tag>),
            },
            { title: 'Элемент', dataIndex: 'name' },
            { title: 'Базовый план', dataIndex: 'baseDate', width: 140, render: (v: string) => fmtDate(v) },
            { title: 'Текущий прогноз', dataIndex: 'forecastDate', width: 140,
              render: (v: string, r: any) => (
                <span style={r.devDays !== 0 ? { color: '#cf1322', fontWeight: 600 } : undefined}>{fmtDate(v)}</span>
              ),
            },
            {
              title: 'Отклонение', dataIndex: 'devDays', width: 120, align: 'right' as const,
              render: (d: number, r: any) =>
                d === 0 ? '—' : <span style={{ color: '#cf1322' }}>+{d} дн.</span>,
            },
          ]}
          rowClassName={(r: any) => (r.devDays !== 0 ? 'cascade-shifted' : '')}
        />
      </Card>

      <Card size="small" title="Финансовые привязки: перенос между месяцами (Ф26)" style={{ marginBottom: 16 }}>
        <Table
          rowKey="itemId"
          size="small"
          dataSource={c.financeShifts}
          pagination={false}
          columns={[
            {
              title: 'Статья', dataIndex: 'article', width: 150,
              render: (a: string, r: any) => <Tag color={r.isRevenue ? 'green' : 'orange'}>{a}</Tag>,
            },
            { title: 'Сумма', dataIndex: 'amount', width: 110, align: 'right' as const, render: (v: number) => fmtMoney(v, 1) },
            { title: 'Месяц по плану', dataIndex: 'planMonth', width: 150, render: (m: string) => fmtMonth(m) },
            { title: 'Месяц по прогнозу', dataIndex: 'forecastMonth', width: 150,
              render: (m: string, r: any) => (
                <span style={r.shiftMonths !== 0 ? { color: '#cf1322', fontWeight: 600 } : undefined}>{fmtMonth(m)}</span>
              ),
            },
            {
              title: 'Сдвиг', dataIndex: 'shiftMonths', width: 110, align: 'right' as const,
              render: (s: number) => (s === 0 ? '—' : <span style={{ color: '#cf1322' }}>+{s} мес.</span>),
            },
          ]}
        />
      </Card>

      <Card size="small" title="Закупки и влияние на график (Ф29)">
        <Table
          rowKey="number"
          size="small"
          dataSource={c.purchases}
          pagination={false}
          columns={[
            { title: 'Номер', dataIndex: 'number', width: 130 },
            { title: 'Наименование', dataIndex: 'name' },
            { title: 'Сумма', dataIndex: 'amount', width: 110, align: 'right' as const, render: (v: number) => fmtMoney(v, 1) },
            { title: 'Статус', dataIndex: 'status', width: 150, render: (s: string) => <Tag>{s}</Tag> },
            { title: 'План', dataIndex: 'planDate', width: 110, render: (v: string) => fmtDate(v) },
            { title: 'Прогноз', dataIndex: 'forecastDate', width: 110,
              render: (v: string, r: any) => (
                <span style={r.devDays !== 0 ? { color: '#cf1322', fontWeight: 600 } : undefined}>{fmtDate(v)}</span>
              ),
            },
            { title: 'Задержка', dataIndex: 'devDays', width: 100, align: 'right' as const,
              render: (d: number) => (d > 0 ? <span style={{ color: '#cf1322' }}>+{d} дн.</span> : '—'),
            },
            { title: 'Затронутые элементы СДР', dataIndex: 'affected',
              render: (a: string[]) => (a?.length ? a.join(', ') : '—'),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Задержка поставки двигает связанную веху, каскад пересчитывает работы, выручку и кассовые разрывы —
          числа на всех экранах обновляются расчётным движком.
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
