import { useEffect, useState } from 'react'
import { Card, Tabs, Typography, Button, message, Spin } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import mermaid from 'mermaid'
import { api } from '../api'

// Генерация архитектурной спецификации в нотации C4 (требование 4.1.5):
// Mermaid-диаграммы (контекст, контейнеры) + Structurizr DSL с выгрузкой.
let mermaidReady = false

async function renderMermaid(id: string, code: string): Promise<string> {
  if (!mermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })
    mermaidReady = true
  }
  const { svg } = await mermaid.render(id, code)
  return svg
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function C4Page() {
  const [spec, setSpec] = useState<{ mermaidContext: string; mermaidContainer: string; structurizrDsl: string } | null>(null)
  const [ctxSvg, setCtxSvg] = useState('')
  const [contSvg, setContSvg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    api
      .c4()
      .then(async (s) => {
        setSpec(s)
        try {
          const [a, b] = await Promise.all([
            renderMermaid('c4ctx', s.mermaidContext),
            renderMermaid('c4cont', s.mermaidContainer),
          ])
          setCtxSvg(a)
          setContSvg(b)
        } catch (e: any) {
          setErr(String(e?.message ?? e))
        }
      })
      .catch((e) => setErr(e.message))
  }, [])

  if (err) return <Card>Ошибка: {err}</Card>
  if (!spec) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <Card size="small" title="Архитектурная спецификация в нотации C4 (генерация)">
      <Typography.Paragraph type="secondary">
        Спецификация описывает фактическую структуру ИСУП: контекст (уровень 1) и контейнеры (уровень 2),
        включая интерфейс ИИ-провайдера — точку подключения полной модели в пилоте. Диаграммы рендерятся
        open-source библиотекой Mermaid; DSL Structurizr доступен для выгрузки.
      </Typography.Paragraph>
      <Tabs
        items={[
          {
            key: 'context',
            label: 'Контекст (C4-1)',
            children: (
              <>
                <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: ctxSvg }} />
                <Button
                  style={{ marginTop: 8 }}
                  icon={<DownloadOutlined />}
                  onClick={() => download('isup-c4-context.md', '```mermaid\n' + spec.mermaidContext + '```')}
                >
                  Скачать Mermaid
                </Button>
              </>
            ),
          },
          {
            key: 'container',
            label: 'Контейнеры (C4-2)',
            children: (
              <>
                <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: contSvg }} />
                <Button
                  style={{ marginTop: 8 }}
                  icon={<DownloadOutlined />}
                  onClick={() => download('isup-c4-containers.md', '```mermaid\n' + spec.mermaidContainer + '```')}
                >
                  Скачать Mermaid
                </Button>
              </>
            ),
          },
          {
            key: 'dsl',
            label: 'Structurizr DSL',
            children: (
              <>
                <pre className="report-text" style={{ maxHeight: 420, overflow: 'auto' }}>{spec.structurizrDsl}</pre>
                <Button
                  style={{ marginTop: 8 }}
                  icon={<DownloadOutlined />}
                  onClick={() => download('isup.workspace.dsl', spec.structurizrDsl)}
                >
                  Скачать .dsl
                </Button>
              </>
            ),
          },
        ]}
      />
    </Card>
  )
}
