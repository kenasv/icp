import { useState } from 'react'
import { Button, Card, Table, Typography, Upload, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { ProjectCard } from '../../types'
import { api } from '../../api'

// Сметный расчёт на работы: импорт Excel (столбец 1 — наименование работы,
// столбец 2 — объём работ). Сервис парсит строки, сохраняет их в связке
// с проектом и присваивает каждой строке случайную сумму.
export default function EstimateTab({ data, reload }: { data: ProjectCard; reload: () => void }) {
  const [importing, setImporting] = useState(false)
  const estimate = data.project.estimate || []

  const importExcel = async (file: File) => {
    setImporting(true)
    try {
      await api.importEstimate(data.project.id, file)
      message.success('Сметный расчёт загружен: суммы по строкам присвоены')
      reload()
    } catch (e: any) {
      message.error(e.message)
    } finally {
      setImporting(false)
    }
  }

  const total = estimate.reduce((s, it) => s + (it.amount || 0), 0)

  return (
    <Card
      size="small"
      title="Сметный расчёт на работы"
      extra={
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
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        Файл: столбец 1 — наименование работы, столбец 2 — объём работ (например, «120 м²», «40 ч»).
        Сервис парсит строки и сохраняет их в связке с проектом, присваивая каждой строке
        случайную сумму (0,1–2,0 млн ₽).
      </Typography.Paragraph>
      <Table
        rowKey="id"
        size="small"
        dataSource={estimate}
        pagination={false}
        scroll={{ x: 620 }}
        locale={{ emptyText: 'Строки сметного расчёта ещё не загружены' }}
        columns={[
          { title: 'Работа', dataIndex: 'name' },
          { title: 'Объём работ', dataIndex: 'volume', width: 160 },
          { title: 'Сумма, млн ₽', dataIndex: 'amount', width: 120, align: 'right' as const,
            render: (v: number) => (v ?? 0).toFixed(1).replace('.', ',') },
        ]}
        summary={() =>
          estimate.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><b>Итого по смете</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} align="right">
                <b>{total.toFixed(1).replace('.', ',')}</b>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null
        }
      />
    </Card>
  )
}
