import { Card, Table, Tag, Typography, DatePicker, message, Button } from 'antd'
import type { ProjectCard, WBSRow } from '../../types'
import Gantt from '../../components/Gantt'
import { api } from '../../api'
import { fmtDate, toDateInput } from '../../format'

// Вкладка СДР и Ганта (Ф13–Ф19): два уровня декомпозиции, вехи,
// зависимости «финиш-старт + лаг», ручной сдвиг с каскадным пересчётом.
export default function GanttTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const rows = data.computed.schedule

  const from = new Date(Math.min(...rows.map((r) => +new Date(r.hasBase && r.baseStart < r.start ? r.baseStart : r.start))))
  const to = new Date(Math.max(...rows.map((r) => +new Date(r.end))))
  from.setDate(from.getDate() - 3)
  to.setDate(to.getDate() + 3)

  const shiftItem = async (row: WBSRow, days: number) => {
    if (row.purchase) {
      message.info('Веха управляется закупкой — измените прогнозную дату поставки на вкладке «Закупки»')
      return
    }
    const d = new Date(row.start)
    d.setDate(d.getDate() + days)
    try {
      await api.patchWbs(data.project.id, row.id, { start: d.toISOString().slice(0, 10) })
      message.success(`«${row.name}» сдвинута на ${days > 0 ? '+' : ''}${days} дн., зависимые сроки пересчитаны`)
      reload()
    } catch (e: any) {
      message.error(e.message)
    }
  }

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          Зависимости — только «финиш-старт» с лагом в днях (Ф15). Сдвиг элемента автоматически пересчитывает зависимые
          сроки (Ф19). Серым пунктиром показан утверждённый базовый план, красным — сдвинутые элементы (Ф18).
        </Typography.Paragraph>
        <Gantt rows={rows} from={from} to={to} />
      </Card>

      <Card size="small" title="Структурная декомпозиция работ (Ф13)">
        <Table<WBSRow>
          rowKey="id"
          size="small"
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1050 }}
          columns={[
            {
              title: 'Тип', dataIndex: 'type', width: 90,
              render: (t: string) => t === 'phase' ? <Tag>этап</Tag> : t === 'work' ? <Tag color="blue">работа</Tag> : <Tag color="gold">веха</Tag>,
            },
            { title: 'Название', dataIndex: 'name' },
            { title: 'Прогноз (начало)', dataIndex: 'start', width: 130, render: (v: string) => fmtDate(v) },
            { title: 'Прогноз (окончание)', dataIndex: 'end', width: 130, render: (v: string, r) => (r.type === 'milestone' ? '—' : fmtDate(v)) },
            { title: 'Базовый план', dataIndex: 'baseStart', width: 130,
              render: (v: string, r) => (r.hasBase ? fmtDate(r.type === 'milestone' ? v : r.baseEnd) : '—') },
            {
              title: 'Отклонение', dataIndex: 'devDays', width: 100, align: 'right' as const,
              render: (d: number, r) =>
                !r.hasBase || d === 0 ? '—' : <span style={{ color: '#cf1322' }}>+{d} дн.</span>,
            },
            {
              title: 'Зависимости (Ф15)', dataIndex: 'dependencies', width: 240,
              render: (deps: any[], r) =>
                (deps || []).map((d) => {
                  const pred = rows.find((x) => x.id === d.fromId)
                  return (
                    <Tag key={d.fromId}>
                      {pred?.name ?? d.fromId} — ФС{d.lagDays ? ` +${d.lagDays} дн.` : ''}
                    </Tag>
                  )
                }),
            },
            {
              title: 'Сдвиг (Ф19)', width: 150,
              render: (_: any, r: WBSRow) =>
                r.type === 'phase' ? null : (
                  <>
                    <Button size="small" onClick={() => shiftItem(r, 7)} disabled={!!r.purchase}>+7 дн.</Button>{' '}
                    <Button size="small" onClick={() => shiftItem(r, -7)} disabled={!!r.purchase}>−7 дн.</Button>
                  </>
                ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
