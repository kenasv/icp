import { useState } from 'react'
import { Button, Drawer, Input, List, Tag, FloatButton, message } from 'antd'
import { RobotOutlined, SendOutlined, FileTextOutlined } from '@ant-design/icons'
import { api } from '../api'

// ИИ-панель: чат-бот в правом нижнем углу (Ф38).
// Ответы собираются из данных движка на бэкенде; при нераспознанном вопросе — fallback.
interface Msg { role: 'user' | 'ai'; text: string }

const QUICK = [
  'Какой статус у проекта 2?',
  'Прогноз выручки портфеля',
  'Какие риски по Wi-Fi для ТЦ Мега?',
  'Покажи воронку пресейлов',
  'Сроки проекта PRJ-2024-001',
]

export default function AiChat() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Здравствуйте! Я демо-ассистент ИСУП. Спросите про статус, сроки, суммы, риски, GM, ДДС проекта или портфеля.' },
  ])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const ask = async (question: string) => {
    if (!question.trim() || loading) return
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setQ('')
    setLoading(true)
    try {
      const { answer } = await api.aiChat(question)
      setMsgs((m) => [...m, { role: 'ai', text: answer }])
    } catch (e: any) {
      message.error('Ошибка: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <FloatButton
        icon={<RobotOutlined />}
        type="primary"
        tooltip="ИИ-ассистент"
        onClick={() => setOpen(true)}
        style={{ right: 24, bottom: 24, width: 48, height: 48 }}
      />
      <Drawer
        title={<span><RobotOutlined /> ИИ-ассистент ИСУП</span>}
        placement="right"
        width="min(420px, 100vw)"
        open={open}
        onClose={() => setOpen(false)}
        styles={{ body: { display: 'flex', flexDirection: 'column', padding: '12px 16px' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <List
            dataSource={msgs}
            renderItem={(m) => (
              <List.Item style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: m.role === 'user' ? '#2f54eb' : '#f0f2f5',
                    color: m.role === 'user' ? '#fff' : 'rgba(0,0,0,0.88)',
                    whiteSpace: 'pre-wrap',
                    fontSize: 13,
                  }}
                >
                  {m.role === 'ai' && <Tag color="purple" style={{ marginBottom: 4 }}>демо-модель</Tag>}
                  {m.text}
                </div>
              </List.Item>
            )}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {QUICK.map((s) => (
              <Button key={s} size="small" onClick={() => ask(s)} icon={<FileTextOutlined />}>
                {s.length > 34 ? s.slice(0, 32) + '…' : s}
              </Button>
            ))}
          </div>
          <Input.Search
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onSearch={ask}
            placeholder="Вопрос по проекту или портфелю…"
            enterButton={<SendOutlined />}
            loading={loading}
          />
        </div>
      </Drawer>
    </>
  )
}
