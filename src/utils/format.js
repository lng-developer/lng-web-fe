import dayjs from '@/lib/dayjs'

export function formatCurrency(value, locale = 'vi-VN', currency = 'VND') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

export function formatDate(date, pattern = 'DD/MM/YYYY') {
  return dayjs(date).format(pattern)
}
