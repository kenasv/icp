import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, message, Modal, Select, Table, Tabs, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../api'
import type { Client, Supplier, Employee, Stage } from '../types'
import { fmtPct } from '../format'

// Справочники (Ф12): клиенты, поставщики, сотрудники — предзагруженные демо-данные
// плюс заведение новых позиций из интерфейса (хранение — PostgreSQL).
// Этапы воронки не редактируются: их вероятности связаны с расчётным движком (Ф2).
const POSITIONS = ['РП', 'Директор департамента', 'Инженер', 'Менеджер по закупкам']
type Entity = 'clients' | 'suppliers' | 'employees'

export default function Directories() {
  const [data, setData] = useState<{
    clients: Client[]; suppliers: Supplier[]; employees: Employee[]; stages: Stage[]
  } | null>(null)
  const [entity, setEntity] = useState<Entity | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const load = () => api.directories().then(setData)
  useEffect(() => { load() }, [])

  if (!data) return <Card>Загрузка…</Card>

  const openModal = (e: Entity) => {
    setEntity(e)
    form.resetFields()
  }

  const submit = async (vals: any) => {
    if (!entity) return
    setSaving(true)
    try {
      const item = await api.createDirectoryItem(entity, vals)
      message.success(`Добавлена позиция справочника: ${item.name}`)
      setEntity(null)
      load()
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Заголовок вкладки с кнопкой заведения новой позиции.
  const addBtn = (e: Entity, label: string) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <Button type="primary" ghost icon={<PlusOutlined />} onClick={() => openModal(e)}>
        {label}
      </Button>
    </div>
  )

  const entityNames: Record<Entity, string> = {
    clients: 'клиента',
    suppliers: 'поставщика',
    employees: 'сотрудника',
  }

  return (
    <Card size="small" title="Справочники (демо-данные + позиции, добавленные из интерфейса, Ф12)">
      <Tabs
        items={[
          {
            key: 'clients',
            label: `Клиенты (${data.clients.length})`,
            children: (
              <>
                {addBtn('clients', 'Добавить клиента')}
                <Table<Client> rowKey="id" size="small" dataSource={data.clients} pagination={false}
                scroll={{ x: 660 }}
                columns={[
                  { title: 'Наименование', dataIndex: 'name' },
                  { title: 'ИНН', dataIndex: 'inn', width: 140 },
                  { title: 'Сегмент', dataIndex: 'segment', width: 160, render: (s: string) => <Tag>{s}</Tag> },
                  { title: 'Регион', dataIndex: 'region', width: 160 },
                ]} />
              </>
            ),
          },
          {
            key: 'suppliers',
            label: `Поставщики (${data.suppliers.length})`,
            children: (
              <>
                {addBtn('suppliers', 'Добавить поставщика')}
                <Table<Supplier> rowKey="id" size="small" dataSource={data.suppliers} pagination={false}
                columns={[{ title: 'Наименование', dataIndex: 'name' }]} />
              </>
            ),
          },
          {
            key: 'employees',
            label: `Сотрудники (${data.employees.length})`,
            children: (
              <>
                {addBtn('employees', 'Добавить сотрудника')}
                <Table<Employee> rowKey="id" size="small" dataSource={data.employees} pagination={false}
                columns={[
                  { title: 'ФИО', dataIndex: 'name' },
                  { title: 'Должность', dataIndex: 'position', width: 240,
                    render: (p: string) => <Tag color={p === 'РП' ? 'green' : p === 'Директор департамента' ? 'geekblue' : 'default'}>{p}</Tag> },
                ]} />
              </>
            ),
          },
          {
            key: 'stages',
            label: 'Этапы воронки',
            children: (
              <>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                  Этапы и вероятности фиксированы требованиями к воронке (Ф2): произвольное добавление
                  этапов не поддерживается, т.к. вероятности участвуют в расчёте взвешенной суммы движком.
                </Typography.Paragraph>
                <Table<Stage> rowKey="id" size="small" dataSource={data.stages} pagination={false}
                columns={[
                  { title: 'Порядок', dataIndex: 'order', width: 100 },
                  { title: 'Этап', dataIndex: 'name' },
                  { title: 'Вероятность', dataIndex: 'probability', width: 160, render: (v: number) => fmtPct(v, 0) },
                ]} />
              </>
            ),
          },
        ]}
      />

      <Modal
        open={!!entity}
        title={entity ? `Новая позиция: ${entityNames[entity]}` : ''}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={saving}
        onCancel={() => setEntity(null)}
        onOk={() => form.submit()}
        width="min(520px, calc(100vw - 24px))"
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="name" label={entity === 'employees' ? 'ФИО' : 'Наименование'}
            rules={[{ required: true, message: 'Обязательное поле' }]}>
            <Input placeholder={entity === 'employees' ? 'Например: Смирнов С.С.' : 'Наименование'} />
          </Form.Item>
          {entity === 'clients' && (
            <>
              <Form.Item name="inn" label="ИНН"
                rules={[{ pattern: /^\d{10}(\d{2})?$/, message: 'ИНН — 10 или 12 цифр' }]}>
                <Input placeholder="10 или 12 цифр" />
              </Form.Item>
              <Form.Item name="segment" label="Сегмент" initialValue="Прочее">
                <Select options={['Транспорт', 'Ритейл', 'Нефтегаз', 'Логистика', 'Промышленность', 'E-commerce', 'Девелопмент', 'Госсектор', 'Финансы', 'Прочее'].map((s) => ({ value: s, label: s }))} />
              </Form.Item>
              <Form.Item name="region" label="Регион">
                <Input placeholder="Например: Москва" />
              </Form.Item>
            </>
          )}
          {entity === 'employees' && (
            <Form.Item name="position" label="Должность" initialValue="Инженер">
              <Select options={POSITIONS.map((p) => ({ value: p, label: p }))} />
            </Form.Item>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Позиция сохраняется в справочник (PostgreSQL) и сразу доступна в формах пресейлов и проектов.
          </Typography.Text>
        </Form>
      </Modal>
    </Card>
  )
}
