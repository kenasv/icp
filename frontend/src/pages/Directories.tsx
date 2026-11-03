import { useEffect, useState } from 'react'
import { Card, Table, Tabs, Tag } from 'antd'
import { api } from '../api'
import type { Client, Supplier, Employee, Stage } from '../types'
import { fmtPct } from '../format'

// Справочники (Ф12): клиенты, поставщики, сотрудники — предзагруженные,
// без иерархии и проверки дублей. Плюс этапы воронки.
export default function Directories() {
  const [data, setData] = useState<{
    clients: Client[]; suppliers: Supplier[]; employees: Employee[]; stages: Stage[]
  } | null>(null)

  useEffect(() => {
    api.directories().then(setData)
  }, [])

  if (!data) return <Card>Загрузка…</Card>

  return (
    <Card size="small" title="Справочники (предзагруженные демо-данные, Ф12)">
      <Tabs
        items={[
          {
            key: 'clients',
            label: `Клиенты (${data.clients.length})`,
            children: (
                <Table<Client> rowKey="id" size="small" dataSource={data.clients} pagination={false}
                scroll={{ x: 660 }}
                columns={[
                  { title: 'Наименование', dataIndex: 'name' },
                  { title: 'ИНН', dataIndex: 'inn', width: 140 },
                  { title: 'Сегмент', dataIndex: 'segment', width: 160, render: (s: string) => <Tag>{s}</Tag> },
                  { title: 'Регион', dataIndex: 'region', width: 160 },
                ]} />
            ),
          },
          {
            key: 'suppliers',
            label: `Поставщики (${data.suppliers.length})`,
            children: (
              <Table<Supplier> rowKey="id" size="small" dataSource={data.suppliers} pagination={false}
                columns={[{ title: 'Наименование', dataIndex: 'name' }]} />
            ),
          },
          {
            key: 'employees',
            label: `Сотрудники (${data.employees.length})`,
            children: (
              <Table<Employee> rowKey="id" size="small" dataSource={data.employees} pagination={false}
                columns={[
                  { title: 'ФИО', dataIndex: 'name' },
                  { title: 'Должность', dataIndex: 'position', width: 240,
                    render: (p: string) => <Tag color={p === 'РП' ? 'green' : p === 'Директор департамента' ? 'geekblue' : 'default'}>{p}</Tag> },
                ]} />
            ),
          },
          {
            key: 'stages',
            label: 'Этапы воронки',
            children: (
              <Table<Stage> rowKey="id" size="small" dataSource={data.stages} pagination={false}
                columns={[
                  { title: 'Порядок', dataIndex: 'order', width: 100 },
                  { title: 'Этап', dataIndex: 'name' },
                  { title: 'Вероятность', dataIndex: 'probability', width: 160, render: (v: number) => fmtPct(v, 0) },
                ]} />
            ),
          },
        ]}
      />
    </Card>
  )
}
