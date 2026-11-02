import { useEffect, useRef, useState } from 'react'
import { Card, Select, Button, Space, Tag, Typography, message, Alert } from 'antd'
import { SaveOutlined, UndoOutlined } from '@ant-design/icons'
import Modeler from 'bpmn-js/lib/Modeler'
import { api } from '../api'

// BPMN-модуль (требование 4.1.5): генерация процессов ИСУП «в нужных разрезах»
// и их изменение в open-source редакторе bpmn-js (аналог OpenBPMN, встраивается в React).
// Правки сохраняются на бэкенде; «Сбросить» возвращает сгенерированную версию.
export default function BpmnPage() {
  const [list, setList] = useState<{ key: string; name: string; description: string; customized: boolean }[]>([])
  const [key, setKey] = useState('')
  const [source, setSource] = useState('')
  const [dirty, setDirty] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const modelerRef = useRef<Modeler | null>(null)

  useEffect(() => {
    api.bpmnList().then((l) => {
      setList(l)
      if (l.length && !key) setKey(l[0].key)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!key || !containerRef.current) return
    const modeler = new Modeler({ container: containerRef.current })
    modelerRef.current = modeler

    api
      .bpmnGet(key)
      .then(({ xml, source }) => {
        setSource(source)
        setDirty(false)
        return modeler.importXML(xml)
      })
      .catch((e: any) => message.error('Ошибка загрузки BPMN: ' + (e?.message ?? e)))

    // Активируем «Сохранить» после первой правки пользователя.
    const events: any = modeler.get('eventBus')
    events.on('commandStack.changed', () => setDirty(true))

    return () => {
      modeler.destroy()
      modelerRef.current = null
    }
  }, [key])

  const save = async () => {
    if (!modelerRef.current) return
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true })
      await api.bpmnPut(key, xml)
      setSource('custom')
      setDirty(false)
      message.success('Изменённая диаграмма сохранена')
      setList(await api.bpmnList())
    } catch (e: any) {
      message.error(e.message)
    }
  }

  const reset = async () => {
    try {
      const { xml } = await api.bpmnReset(key)
      setSource('generated')
      setDirty(false)
      await modelerRef.current?.importXML(xml)
      message.success('Возвращена сгенерированная версия')
      setList(await api.bpmnList())
    } catch (e: any) {
      message.error(e.message)
    }
  }

  const current = list.find((d) => d.key === key)

  return (
    <Card
      size="small"
      title="BPMN-процессы ИСУП: генерация и изменение"
      extra={
        <Space>
          <Select
            value={key || undefined}
            onChange={setKey}
            style={{ width: 340 }}
            placeholder="Выберите процесс"
            options={list.map((d) => ({ value: d.key, label: d.name }))}
          />
          <Button icon={<UndoOutlined />} onClick={reset} disabled={!current?.customized && source !== 'custom'}>
            Сбросить к генерации
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={save} disabled={!dirty}>
            Сохранить изменения
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        Диаграммы генерируются бэкендом (BPMN 2.0 XML с диаграммной частью DI) и открываются в редакторе
        bpmn-js. Правки сохраняются на бэкенде и отдаются вместо сгенерированной версии.
      </Typography.Paragraph>
      {current && (
        <Typography.Paragraph style={{ marginBottom: 8 }}>
          <Tag color={source === 'custom' ? 'orange' : 'blue'}>
            {source === 'custom' ? 'кастомизированная версия' : 'сгенерированная версия'}
          </Tag>
          {current.description}
        </Typography.Paragraph>
      )}
      <div className="bpmn-container" ref={containerRef} />
      {!dirty && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          message="Перетащите элементы, переименуйте задачи через панель свойств — затем нажмите «Сохранить изменения»."
        />
      )}
    </Card>
  )
}
