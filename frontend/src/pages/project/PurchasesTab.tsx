import { useState } from 'react'
import { Card, Table, Tag, Typography, DatePicker, Select, Modal, List, message, Alert } from 'antd'
import type { ProjectCard, ImpactPreview } from '../../types'
import { api } from '../../api'
import { fmtDate, fmtMoney, toDateInput } from '../../format'

// Закупки (Ф27–Ф29): статусы, план/прогноз поставки. Перед изменением прогнозной
// даты — предупреждение с числом затронутых задач и вех (Ф20) и подтверждение.
const STATUS_FLOW = ['создана', 'заказ размещён', 'договор подписан', 'получено']

export default function PurchasesTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const [preview, setPreview] = useState<{ pid: string; date: string; data: ImpactPreview } | null>(null)
  const [saving, setSaving] = useState(false)
  const purchases = data.project.purchases

  const mileName = (id: string) => data.computed.schedule.find((r) => r.id === id)?.name ?? id
  const supplierName = (id: string) => id // имена поставщиков приходят в карточке привязок Ганта

  const changeForecast = async (pid: string, isoDate: string) => {
    // Ф20: сначала показываем влияние по графу зависимостей, сохраняем после подтверждения.
    const pv = await api.purchasePreview(data.project.id, pid, isoDate)
    setPreview({ pid, date: isoDate, data: pv })
  }

  const applyChange = async () => {
    if (!preview) return
    setSaving(true)
    try {
      await api.patchPurchase(data.project.id, preview.pid, { forecastDate: preview.date })
      message.success('Прогноз поставки обновлён, график и финансы пересчитаны')
      setPreview(null)
      reload()
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card size="small" title="Закупки проекта (Ф27–Ф29)">
      <Table
        rowKey="id"
        size="small"
        dataSource={purchases}
        pagination={false}
        scroll={{ x: 1100 }}
        locale={{ emptyText: 'Закупок нет' }}
        columns={[
          { title: 'Номер', dataIndex: 'number', width: 130 },
          { title: 'Наименование', dataIndex: 'name' },
          { title: 'Сумма', dataIndex: 'amount', width: 110, align: 'right' as const, render: (v: number) => fmtMoney(v, 1) },
          {
            title: 'Статус (Ф28)', dataIndex: 'status', width: 190,
            render: (s: string, r: any) => (
              <Select
                size="small"
                value={s}
                style={{ width: '100%' }}
                onChange={async (v) => {
                  await api.patchPurchase(data.project.id, r.id, { status: v })
                  message.success('Статус закупки обновлён')
                  reload()
                }}
                options={STATUS_FLOW.map((x) => ({ value: x, label: x }))}
              />
            ),
          },
          { title: 'План поставки', dataIndex: 'planDate', width: 120, render: (v: string) => fmtDate(v) },
          {
            title: 'Прогноз поставки', dataIndex: 'forecastDate', width: 170,
            render: (v: string, r: any) => {
              const delayed = new Date(v) > new Date(r.planDate)
              return (
                <DatePicker
                  size="small"
                  value={undefined as any}
                  placeholder={fmtDate(v)}
                  onChange={(d) => d && changeForecast(r.id, d.format('YYYY-MM-DD'))}
                  style={{ width: 140, borderColor: delayed ? '#cf1322' : undefined }}
                />
              )
            },
          },
          {
            title: 'Задержка', width: 100, align: 'right' as const,
            render: (_: any, r: any) => {
              const dev = Math.round((+new Date(r.forecastDate) - +new Date(r.planDate)) / 86400000)
              return dev > 0 ? <span style={{ color: '#cf1322' }}>+{dev} дн.</span> : '—'
            },
          },
          { title: 'Веха', dataIndex: 'milestoneId', render: (id: string) => mileName(id) },
        ]}
      />
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
        Задержка закупки двигает связанную веху поставки и каскад зависимых работ; выручка и платежи
        пересчитываются помесячно (Ф29). Перед сохранением показывается предупреждение (Ф20).
      </Typography.Paragraph>

      <Modal
        open={!!preview}
        title="Подтвердите пересчёт графика (Ф20)"
        onOk={applyChange}
        onCancel={() => setPreview(null)}
        okText="Пересчитать и сохранить"
        cancelText="Отмена"
        confirmLoading={saving}
        width="min(640px, calc(100vw - 24px))"
      >
        {preview && (
          <>
            <Alert
              type="warning"
              showIcon
              message={`Изменение затронет ${preview.data.affectedMilestones} вех(и) и ${preview.data.affectedWorks} работ(ы) — пересчёт по графу зависимостей.`}
              style={{ marginBottom: 12 }}
            />
            <List
              size="small"
              dataSource={preview.data.items}
              renderItem={(it) => (
                <List.Item>
                  <Tag color={it.type === 'milestone' ? 'gold' : 'blue'}>{it.type === 'milestone' ? 'веха' : 'работа'}</Tag>
                  <span style={{ flex: 1 }}>{it.name}</span>
                  <span>
                    {fmtDate(it.oldDate)} → <b style={{ color: '#cf1322' }}>{fmtDate(it.newDate)}</b> (+{it.deltaDays} дн.)
                  </span>
                </List.Item>
              )}
            />
          </>
        )}
      </Modal>
    </Card>
  )
}
