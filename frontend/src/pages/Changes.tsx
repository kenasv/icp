import { useEffect, useState } from 'react'
import { Card, Table, Tag, Typography, Button, Steps, Space, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { ChangeRequest } from '../types'
import { fmtDate, fmtSignedPct } from '../format'

// Реестр запросов на изменение по всем проектам (Ф33).
export default function Changes() {
  const [crs, setCrs] = useState<ChangeRequest[] | null>(null)
  const navigate = useNavigate()

  const load = () => api.changeRequests().then(setCrs)
  useEffect(() => { load() }, [])

  if (!crs) return <Card>Загрузка…</Card>

  const setStatus = async (cr: ChangeRequest, status: string) => {
    await api.patchCR(cr.id, status)
    message.success(status === 'утверждён' ? `ЗИ ${cr.id} утверждён: создана новая версия базового плана` : `Статус: ${status}`)
    load()
  }

  return (
    <Card size="small" title="Реестр запросов на изменение базового плана (Ф33–Ф34)">
      <Table<ChangeRequest>
        rowKey="id"
        size="small"
        dataSource={crs}
        pagination={false}
        scroll={{ x: 1250 }}
        columns={[
          { title: 'Номер', dataIndex: 'id', width: 120 },
          {
            title: 'Проект', dataIndex: 'projectId', width: 140,
            render: (id: string) => (
              <a onClick={() => navigate(`/projects/${id}`)}>{id}</a>
            ),
          },
          {
            title: 'Тип', dataIndex: 'type', width: 90,
            render: (t: string) => <Tag color={t === 'сроки' ? 'blue' : t === 'бюджет' ? 'gold' : 'purple'}>{t}</Tag>,
          },
          { title: 'Причина', dataIndex: 'reason', ellipsis: true },
          { title: 'Создан', dataIndex: 'createdAt', width: 110, render: (v: string) => fmtDate(v) },
          {
            title: 'Влияние (авто)', width: 200,
            render: (_: any, cr) => (
              <span>
                GM <b style={{ color: cr.impactGmPp < 0 ? '#cf1322' : undefined }}>{fmtSignedPct(cr.impactGmPp)}</b> · ДДС{' '}
                <b style={{ color: cr.impactDds > 0 ? '#cf1322' : undefined }}>
                  {cr.impactDds > 0 ? '+' : ''}{cr.impactDds.toFixed(1).replace('.', ',')} млн ₽
                </b>
              </span>
            ),
          },
          {
            title: 'Статус и маршрут', width: 360,
            render: (_: any, cr) => (
              <Space>
                <Steps
                  size="small"
                  current={cr.status === 'черновик' ? 0 : cr.status === 'на согласовании' ? 1 : 2}
                  items={[{ title: 'черновик' }, { title: 'согласование' }, { title: 'утверждён' }]}
                  style={{ minWidth: 230 }}
                />
                {cr.status === 'черновик' && <Button size="small" onClick={() => setStatus(cr, 'на согласовании')}>На согласование</Button>}
                {cr.status === 'на согласовании' && (
                  <Button size="small" type="primary" onClick={() => setStatus(cr, 'утверждён')}>Утвердить</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
        Маршрут: черновик → на согласовании → утверждён. При утверждении автоматически создаётся новая версия
        базового плана (v1, v2, …) со срезом дат и помесячных финансов.
      </Typography.Paragraph>
    </Card>
  )
}
