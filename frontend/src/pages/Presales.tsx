import { useEffect, useState } from 'react'
import {
  Card, Typography, Tag, Drawer, Descriptions, Timeline, Button, message, Tooltip, Input, Modal,
  Form, Select, InputNumber, DatePicker, Space,
} from 'antd'
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ArrowRightOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { PresaleView, Stage, Client, Employee, Work, Product, Region } from '../types'
import { fmtDate, fmtMoney } from '../format'
import { useNavigate } from 'react-router-dom'

// Воронка пресейлов (Ф1–Ф6): канбан с перетаскиванием между этапами;
// при смене этапа вероятность и взвешенная сумма пересчитываются (Ф3),
// метрики этапов — над колонками (Ф4), передача в проект одной кнопкой (Ф6),
// заведение новой карточки пресейла с составом работ планируемого проекта (Ф1).
export default function Presales() {
  const [presales, setPresales] = useState<PresaleView[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [selected, setSelected] = useState<PresaleView | null>(null)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = () => {
    api.presales().then(setPresales)
    api.directories().then((d) => {
      setStages(d.stages)
      setClients(d.clients)
      setEmployees(d.employees)
      setWorks(d.works)
      setProducts(d.products)
      setRegions(d.regions)
    })
  }
  useEffect(() => { load() }, [])

  // Создание карточки пресейла (Ф1): номер и история присваиваются на бэкенде.
  // Даты строк состава работ уходят в ISO (бэкенд ждёт RFC3339).
  const createPresale = async (vals: any) => {
    setCreating(true)
    try {
      const scope = (vals.scope || []).map((s: any) => ({
        workId: s.workId,
        date: s.date?.toISOString ? s.date.toISOString() : s.date,
        cost: s.cost,
      }))
      const ps = await api.createPresale({ ...vals, scope })
      message.success(`Создан пресейл ${ps.number} «${ps.name}» на этапе ${ps.stageName}`)
      setCreateOpen(false)
      form.resetFields()
      load()
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  const active = presales.filter((p) => !p.projectId)
  const converted = presales.filter((p) => p.projectId)

  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]))

  const onDragEnd = async (e: DragEndEvent) => {
    const stageId = e.over?.id as string
    const id = e.active.id as string
    if (!stageId || !id) return
    const ps = presales.find((p) => p.id === id)
    if (!ps || ps.stageId === stageId) return
    try {
      await api.movePresale(id, stageId)
      message.success(`Этап изменён: ${stageById[stageId]?.name}. Вероятность и взвешенная сумма пересчитаны.`)
      load()
      setSelected((s) => (s && s.id === id ? null : s))
    } catch (err: any) {
      message.error(err.message)
    }
  }

  const convert = (ps: PresaleView) => {
    Modal.confirm({
      title: `Передать пресейл в реализацию?`,
      content: `Будет создан проект с переносом клиента, продукта, бюджета-заготовки и истории (Ф6).`,
      okText: 'Создать проект',
      onOk: async () => {
        try {
          const { projectId } = await api.convertPresale(ps.id)
          message.success(`Создан проект ${projectId}; связь видна в обеих карточках`)
          navigate(`/projects/${projectId}`)
        } catch (e: any) {
          message.error(e.message)
        }
      },
    })
  }

  const filtered = active.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()),
  )

  // Метрики воронки (Ф4–Ф5).
  const totals = stages.map((st) => {
    const items = filtered.filter((p) => p.stageId === st.id)
    return {
      stage: st,
      count: items.length,
      sum: items.reduce((s, p) => s + p.amount, 0),
      weighted: items.reduce((s, p) => s + p.weighted, 0),
    }
  })

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Воронка пресейлов
          <Typography.Text type="secondary" style={{ fontSize: 13, marginLeft: 10 }}>
            взвешенная сумма = сумма × вероятность этапа (Ф5)
          </Typography.Text>
        </Typography.Title>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Поиск по названию/клиенту"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 'min(280px, calc(100vw - 200px))' }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Новый пресейл
          </Button>
        </Space>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="kanban-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(min(210px, 78vw), 1fr))`, gap: 10 }}>
            {totals.map(({ stage, count, sum, weighted }) => (
              <Column key={stage.id} stage={stage} count={count} sum={sum} weighted={weighted}>
                {filtered
                  .filter((p) => p.stageId === stage.id)
                  .map((p) => (
                    <PresaleCard key={p.id} ps={p} onOpen={() => setSelected(p)} />
                  ))}
              </Column>
            ))}
          </div>
        </div>
      </DndContext>

      {converted.length > 0 && (
        <Card size="small" title={`Переданные в проекты (${converted.length})`} style={{ marginTop: 16 }}>
          {converted.map((p) => (
            <Tag
              key={p.id}
              color="success"
              style={{ cursor: 'pointer', whiteSpace: 'normal', height: 'auto', marginBottom: 4 }}
              onClick={() => navigate(`/projects/${p.projectId}`)}
            >
              {p.number} «{p.name}» → {p.projectId} ({fmtDate(p.convertedAt)})
            </Tag>
          ))}
        </Card>
      )}

      <Drawer
        title={selected ? `${selected.number} · ${selected.name}` : ''}
        width="min(480px, 100vw)"
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Клиент">{selected.clientName}</Descriptions.Item>
              <Descriptions.Item label="Продукт">{selected.product}</Descriptions.Item>
              <Descriptions.Item label="Регион">{selected.region}</Descriptions.Item>
              <Descriptions.Item label="Плановая выручка от проекта">{fmtMoney(selected.amount)} млн ₽</Descriptions.Item>
              <Descriptions.Item label="Этап воронки">
                {selected.stageName} · вероятность {(selected.probability * 100).toFixed(0)}%
              </Descriptions.Item>
              <Descriptions.Item label="Взвешенная сумма">{fmtMoney(selected.weighted)}</Descriptions.Item>
              <Descriptions.Item label="Источник лида">{selected.leadSource}</Descriptions.Item>
              <Descriptions.Item label="Команда">{selected.team.length ? 'см. справочник сотрудников' : '—'}</Descriptions.Item>
              <Descriptions.Item label="Связь с проектом">
                {selected.projectId ? (
                  <a onClick={() => navigate(`/projects/${selected.projectId}`)}>{selected.projectId}</a>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
            </Descriptions>

            {selected.scope?.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 16 }}>
                  Состав работ планируемого проекта
                </Typography.Title>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>
                      <th style={{ padding: '4px 8px' }}>Работа</th>
                      <th style={{ padding: '4px 8px' }}>План. дата</th>
                      <th style={{ padding: '4px 8px', textAlign: 'right' }}>Стоимость, млн ₽</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.scope.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '4px 8px' }}>{it.name}</td>
                        <td style={{ padding: '4px 8px' }}>{fmtDate(it.date)}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                          {it.cost.toFixed(1).replace('.', ',')}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }} colSpan={2}>
                        Плановые затраты (сумма)
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>
                        {selected.scope.reduce((s, it) => s + it.cost, 0).toFixed(1).replace('.', ',')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            <Typography.Title level={5} style={{ marginTop: 16 }}>История изменений этапа (Ф1)</Typography.Title>
            <Timeline
              items={(selected.stageHistory || []).map((h) => ({
                children: (
                  <span style={{ fontSize: 13 }}>
                    {fmtDate(h.date)}: {h.fromStage ? stageById[h.fromStage]?.name ?? h.fromStage : 'создан'} →{' '}
                    <b>{stageById[h.toStage]?.name ?? h.toStage}</b>
                  </span>
                ),
              }))}
            />

            {!selected.projectId && (
              <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => convert(selected)}>
                Передать в реализацию (создать проект, Ф6)
              </Button>
            )}
          </>
        )}
      </Drawer>

      {/* Заведение новой карточки пресейла (Ф1) */}
      <Modal
        open={createOpen}
        title="Новый пресейл"
        okText="Создать"
        cancelText="Отмена"
        confirmLoading={creating}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        width="min(560px, calc(100vw - 24px))"
      >
        <Form form={form} layout="vertical" onFinish={createPresale} initialValues={{ stageId: stages[0]?.id }}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input placeholder="Например: Видеонаблюдение для РЖД" />
          </Form.Item>
          <Form.Item name="clientId" label="Клиент" rules={[{ required: true, message: 'Выберите клиента' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Клиент из справочника"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Space wrap style={{ display: 'flex' }}>
            <Form.Item name="product" label="Продукт" style={{ minWidth: 220 }}>
              <Select
                showSearch
                optionFilterProp="label"
                allowClear
                placeholder="Продукт из справочника"
                options={products.map((p) => ({ value: p.name, label: p.name }))}
              />
            </Form.Item>
            <Form.Item name="region" label="Регион" style={{ minWidth: 180 }}>
              <Select
                showSearch
                optionFilterProp="label"
                allowClear
                placeholder="Регион из справочника"
                options={regions.map((r) => ({ value: r.name, label: r.name }))}
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Плановая выручка от проекта, млн ₽"
              rules={[{ required: true, message: 'Укажите плановую выручку' }]}
            >
              <InputNumber min={0.1} step={0.5} style={{ width: 160 }} />
            </Form.Item>
          </Space>

          <Form.Item label="Этап воронки" required style={{ marginBottom: 8 }}>
            <Form.Item name="stageId" noStyle rules={[{ required: true, message: 'Выберите этап' }]}>
              <Select
                placeholder="Этап"
                options={stages.map((s) => ({
                  value: s.id,
                  label: `${s.name} · вероятность ${Math.round(s.probability * 100)}%`,
                }))}
              />
            </Form.Item>
          </Form.Item>

          {/* Состав работ планируемого проекта: строки из справочника видов работ */}
          <Typography.Text strong>Состав работ планируемого проекта</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
            Для каждой строки — плановая дата реализации и плановая стоимость. Виды работ берутся
            из справочника (вкладка «Справочники → Виды работ»). Сумма затрат переносится в проект
            при передаче пресейла в реализацию и участвует в расчёте GM план.
          </Typography.Paragraph>
          <Form.List name="scope">
            {(fields, { add, remove }) => (
              <>
                {fields.map((f) => (
                  <Space key={f.key} wrap align="baseline" style={{ display: 'flex', marginBottom: 4 }}>
                    <Form.Item
                      name={[f.name, 'workId']}
                      rules={[{ required: true, message: 'Выберите работу' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Вид работ из справочника"
                        style={{ width: 'min(280px, calc(100vw - 120px))' }}
                        options={works.map((w) => ({ value: w.id, label: w.name }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[f.name, 'date']}
                      rules={[{ required: true, message: 'Дата реализации' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <DatePicker placeholder="План. дата" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item
                      name={[f.name, 'cost']}
                      rules={[{ required: true, message: 'Стоимость' }]}
                      style={{ marginBottom: 8 }}
                    >
                      <InputNumber min={0.1} step={0.5} placeholder="млн ₽" style={{ width: 120 }} />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(f.name)} />
                  </Space>
                ))}
                <Form.Item style={{ marginBottom: 8 }}>
                  <Button block icon={<PlusOutlined />} onClick={() => add()} disabled={!works.length}>
                    Добавить работу
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
          <Form.Item name="leadSource" label="Источник лида" initialValue="Входящая заявка">
            <Select
              options={['Входящая заявка', 'Партнёр', 'Холодный звонок', 'Тендерная площадка', 'Выставка', 'Повторные продажи', 'Прочее'].map((s) => ({ value: s, label: s }))}
            />
          </Form.Item>
          <Form.Item name="team" label="Команда (пресейл-поддержка)">
            <Select
              mode="multiple"
              allowClear
              placeholder="Можно выбрать позже"
              options={employees.map((e) => ({ value: e.id, label: `${e.name} · ${e.position}` }))}
            />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Номер ПС-2024-NNN присвоится автоматически; вероятность возьмётся с этапа воронки,
            взвешенная сумма пересчитается движком.
          </Typography.Text>
        </Form>
      </Modal>
    </div>
  )
}

function Column({
  stage, count, sum, weighted, children,
}: {
  stage: Stage; count: number; sum: number; weighted: number; children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div
      ref={setNodeRef}
      className="kanban-column"
      style={{ outline: isOver ? '2px dashed #2f54eb' : undefined, background: isOver ? '#e6ecff' : undefined }}
    >
      <div style={{ padding: '4px 6px 10px' }}>
        <Typography.Text strong>
          {stage.name} <Tag style={{ marginLeft: 6 }}>{Math.round(stage.probability * 100)}%</Tag>
        </Typography.Text>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
          {count} шт. · {fmtMoney(sum, 0)} · взвешенно {fmtMoney(weighted, 1)}
        </Typography.Paragraph>
      </div>
      {children}
    </div>
  )
}

function PresaleCard({ ps, onOpen }: { ps: PresaleView; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ps.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`kanban-card${isDragging ? ' dragging' : ''}`}
      onClick={onOpen}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography.Text strong style={{ fontSize: 13 }}>{ps.name}</Typography.Text>
      </div>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '2px 0 4px' }}>
        {ps.number} · {ps.clientName}
      </Typography.Paragraph>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span><b>{ps.amount.toFixed(0)}</b> млн ₽</span>
        <Tooltip title={`Вероятность ${(ps.probability * 100).toFixed(0)}%`}>
          <span style={{ color: '#2f54eb' }}>взв. {ps.weighted.toFixed(1).replace('.', ',')}</span>
        </Tooltip>
      </div>
    </div>
  )
}
