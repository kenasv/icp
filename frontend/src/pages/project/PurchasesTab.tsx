import { useState } from 'react'
import { Card, Table, Tag, Typography, DatePicker, Select, Modal, List, message, Alert, Upload, Button, Space } from 'antd'
import { ThunderboltOutlined, UploadOutlined } from '@ant-design/icons'
import type { ProjectCard, ImpactPreview } from '../../types'
import { api } from '../../api'
import { fmtDate, fmtMoney, toDateInput } from '../../format'

// Закупки (Ф27–Ф29): статусы, план/прогноз поставки. Перед изменением прогнозной
// даты — предупреждение с числом затронутых задач и вех (Ф20) и подтверждение.
// Ниже — состав оборудования проекта: импорт из Excel (столбцы: наименование,
// количество), сервис присваивает случайные сумму и прогнозную дату, статус «Планируется».
const STATUS_FLOW = ['создана', 'заказ размещён', 'договор подписан', 'получено']
const EQUIP_STATUSES = ['Планируется', 'В закупке', 'Доставлено']

export default function PurchasesTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const [preview, setPreview] = useState<{ pid: string; date: string; data: ImpactPreview } | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [delaying, setDelaying] = useState(false)
  const purchases = data.project.purchases
  const equipment = data.project.equipment || []

  const importExcel = async (file: File) => {
    setImporting(true)
    try {
      await api.importEquipment(data.project.id, file)
      message.success('Оборудование из Excel загружено: суммы и прогнозные даты присвоены, статус «Планируется»')
      reload()
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setImporting(false)
    }
  }

  // Проставить даты задержки: случайно, позже прогнозной даты поставки,
  // но не более чем через год от неё; строки обновляются в карточке проекта.
  const setDelays = async () => {
    setDelaying(true)
    try {
      await api.setEquipmentDelays(data.project.id)
      message.success('Даты задержки проставлены по всем позициям оборудования')
      reload()
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setDelaying(false)
    }
  }

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

      {/* Состав оборудования проекта: импорт из Excel (Ф27) */}
      <Card
        size="small"
        title="Оборудование проекта (импорт из Excel)"
        style={{ marginTop: 16 }}
        extra={
          <Space wrap>
            {equipment.length > 0 && (
              <Button
                icon={<ThunderboltOutlined />}
                loading={delaying}
                onClick={setDelays}
                title="Случайно, позже прогнозной даты поставки, но не более чем через год от неё"
              >
                Проставить задержки
              </Button>
            )}
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              disabled={importing}
              customRequest={({ file }) => importExcel(file as unknown as File)}
            >
              <Button icon={<UploadOutlined />} loading={importing}>
                Загрузить Excel
              </Button>
            </Upload>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
          Файл: столбец 1 — наименование оборудования, столбец 2 — количество. Сервис парсит строки
          и сохраняет их в связке с проектом, присваивая случайные сумму и прогнозную дату поставки;
          стартовый статус — «Планируется» (справочник: Планируется / В закупке / Доставлено).
          «Проставить задержки» задаёт дату задержки по каждой строке: случайно, позже прогнозной
          даты поставки, но не более чем через год от неё.
        </Typography.Paragraph>
        <Table
          rowKey="id"
          size="small"
          dataSource={equipment}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Оборудование ещё не загружено' }}
          columns={[
            { title: 'Наименование', dataIndex: 'name' },
            { title: 'Кол-во', dataIndex: 'qty', width: 80, align: 'right' as const },
            { title: 'Сумма, млн ₽', dataIndex: 'amount', width: 110, align: 'right' as const,
              render: (v: number) => (v ?? 0).toFixed(1).replace('.', ',') },
            { title: 'Прогноз поставки', dataIndex: 'forecast', width: 130, render: (v: string) => fmtDate(v) },
            {
              title: 'Задержка', dataIndex: 'delayDate', width: 150,
              render: (v: string | undefined, r: any) => {
                if (!v) return <span style={{ color: '#bbb' }}>—</span>
                const days = Math.round((+new Date(v) - +new Date(r.forecast)) / 86400000)
                return (
                  <span style={{ color: '#cf1322' }}>
                    {fmtDate(v)} <Tag color="red" style={{ marginInlineStart: 4 }}>+{days} дн.</Tag>
                  </span>
                )
              },
            },
            {
              title: 'Статус', dataIndex: 'status', width: 160,
              render: (s: string, r: any) => (
                <Select
                  size="small"
                  value={s}
                  style={{ width: '100%' }}
                  onChange={async (v) => {
                    try {
                      await api.patchEquipment(data.project.id, r.id, v)
                      message.success(`Статус оборудования обновлён: ${v}`)
                      reload()
                    } catch (e: any) {
                      message.error(e.message)
                    }
                  }}
                  options={EQUIP_STATUSES.map((x) => ({ value: x, label: x }))}
                />
              ),
            },
          ]}
        />
      </Card>
    </Card>
  )
}
