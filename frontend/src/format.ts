// Форматтеры интерфейса: суммы в млн ₽, даты ДД.ММ.ГГГГ, русские месяцы (требование 4.1.1).
import type { Zone } from './types'

export const fmtMoney = (v: number | null | undefined, digits = 1): string => {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v.toFixed(digits).replace('.', ',')} млн ₽`
}

export const fmtPct = (v: number | null | undefined, digits = 1): string => {
  if (v == null || Number.isNaN(v)) return '—'
  return `${(v * 100).toFixed(digits).replace('.', ',')}%`
}

export const fmtSignedPct = (v: number): string => {
  const s = v > 0 ? '+' : ''
  return `${s}${v.toFixed(1).replace('.', ',')} п.п.`
}

// Дата из ISO-строки бэкенда → ДД.ММ.ГГГГ.
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

export const fmtDateShort = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const fmtSignedDays = (d: number): string =>
  d === 0 ? '0 дн.' : `${d > 0 ? '+' : ''}${d} дн.`

// «2024-04» → «Апрель 2024».
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const MONTHS_RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export const fmtMonth = (key: string): string => {
  const [y, m] = key.split('-')
  const idx = Number(m) - 1
  return `${MONTHS_RU[idx] ?? key} ${y}`
}

export const fmtMonthShort = (key: string): string => {
  const [, m] = key.split('-')
  const idx = Number(m) - 1
  return MONTHS_RU_SHORT[idx] ?? key
}

export const zoneEmoji = (z: Zone): string =>
  z === 'green' ? '🟢' : z === 'yellow' ? '🟡' : '🔴'

export const zoneColor = (z: Zone): string =>
  z === 'green' ? '#52c41a' : z === 'yellow' ? '#faad14' : '#ff4d4f'

// Дата в формате <input type="date"> (YYYY-MM-DD).
export const toDateInput = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
