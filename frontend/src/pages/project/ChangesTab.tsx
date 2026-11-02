import { useState } from 'react'
import { Card, Table, Tag, Typography, Button, Form, Input, Select, Modal, message, Steps, Space } from 'antd'
import type { ProjectCard, ChangeRequest } from '../../types'
import { api } from '../../api'
import { fmtDate, fmtSignedPct } from '../../format'

// Запросы на изменение проекта (Ф33–Ф34): реестр + форма.
// Черновик → на согласовании → утверждён; утверждение создаёт новую версию базового плана.
export default function ChangesTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)
  const crs = [...data.changeRequests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))

  const create = async (vals: any) => {
    try {
      await api.createCR({ ...vals, projectId: data.project.id })
      message.success('Запрос на изменение создан; влияние рассчитано движком')
      setOpen(false)
      form.resetFields()
      reload()
    } catch (e: any) {
      message.error(e.message)
    }
  }

  const setStatus = async (cr: ChangeRequest, status: string) => {
    try {
      await api.patchCR(cr.id, status)
      message.success(status === 'утверждён' ? 'ЗИ утверждён: создана новая версия базового плана' : `Статус: ${status}`)
      reload()
    } catch (e: any) {
      message.error(e.message)
    }
  }

  return (
    <Card
      size="small"
      title="Запросы на изменение базового плана (Ф33–Ф34)"
      extra={
        <Button type="primary" size="small" onClick={() => setOpen(true)}>
          Создать ЗИ
        </Button>
      }
    >
      <Table<ChangeRequest>
        rowKey="id"
        size="small"
        dataSource={crs}
        pagination={false}
        locale={{ emptyText: 'Запросов нет' }}
        columns={[
          { title: 'Номер', dataIndex: 'id', width: 130 },
          {
            title: 'Тип', dataIndex: 'type', width: 100,
            render: (t: string) => <Tag color={t === 'сроки' ? 'blue' : t === 'бюджет' ? 'gold' : 'purple'}>{t}</Tag>,
          },
          { title: 'Причина', dataIndex: 'reason', ellipsis: true },
          { title: 'Создан', dataIndex: 'createdAt', width: 110, render: (v: string) => fmtDate(v) },
          { title: 'Автор', dataIndex: 'author', width: 150 },
          {
            title: 'Влияние (авто, Ф34)', width: 190,
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
            title: 'Статус', dataIndex: 'status', width: 300,
            render: (s: string, cr) => (
              <Space>
                <Steps
                  size="small"
                  current={s === 'черновик' ? 0 : s === 'на согласовании' ? 1 : 2}
                  items={[{ title: 'черновик' }, { title: 'согласование' }, { title: 'утверждён' }]}
                  style={{ minWidth: 220 }}
                />
                {s === 'черновик' && <Button size="small" onClick={() => setStatus(cr, 'на согласовании')}>На согласование</Button>}
                {s === 'на согласовании' && (
                  <Button size="small" type="primary" onClick={() => setStatus(cr, 'утверждён')}>
                    Утвердить
                  </Button>
                )}
              </Space>
            ),
          },
          {
            title: '', width: 80,
            render: (_: any, cr) => (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{cr.description?.slice(0, 40)}…</Typography.Text>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title="Новый запрос на изменение"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Создать"
      >
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="type" label="Тип изменения" rules={[{ required: true }]}>
            <Select options={[
              { value: 'сроки', label: 'Сроки' },
              { value: 'бюджет', label: 'Бюджет' },
              { value: 'GM', label: 'GM' },
            ]} />
          </Form.Item>
          <Form.Item name="reason" label="Причина" rules={[{ required: true }]}>
            <Input placeholder="Например: задержка поставки у поставщика" />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Что изменяется и почему; влияние на вехи и статьи бюджета" />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Влияние (GM п.п., ДДС млн ₽) будет подставлено автоматически из расчётного движка.
          </Typography.Text>
        </Form>
      </Modal>
    </Card>
  )
}
