import { Typography } from 'antd'
import type { CSSProperties } from 'react'

import { SectionCard } from '@/shared/ui'

import styles from './FoundationPage.module.scss'
import { DonutChart, MiniBars } from './OperationsDashboardCharts'
import type { ChartDatum } from './useOperationsDashboard'

type Card = [string, string]
type Props = {
  title: string; dateLabel: string; cards: Card[]; queueTitle: string; queueData: ChartDatum[]
  summaryTitle: string; summaryData: ChartDatum[]; targetTitle: string; targetPercent: number
  targetLabel: string; recentTitle: string; recentRows: string[]; sideTitle: string; sideRows: string[]
}

export function DashboardVisual({ title, dateLabel, cards, queueTitle, queueData, summaryTitle, summaryData, targetTitle, targetPercent, targetLabel, recentTitle, recentRows, sideTitle, sideRows }: Props) {
  return <section className={styles.mockDashboard}>
    <header className={styles.mockHeader}><div><Typography.Title level={2}>{title}</Typography.Title><Typography.Text type="secondary">{dateLabel}</Typography.Text></div></header>
    <section className={styles.mockHeroCards}>{cards.map(([value, label], index) => <article className={styles.mockHeroCard} key={label}><strong>{value}</strong><span>{label}</span>{index === 0 && <MiniBars data={queueData} total={queueData.reduce((sum, item) => sum + item.value, 0)} compact />}</article>)}</section>
    <section className={styles.mockGrid}>
      <SectionCard title={queueTitle}><DonutChart data={queueData} /></SectionCard>
      <SectionCard title={summaryTitle}><MiniBars data={summaryData} total={summaryData.reduce((sum, item) => sum + item.value, 0)} /></SectionCard>
      <SectionCard title={targetTitle}><div className={styles.monthlyTarget}><div className={styles.targetRing} style={{ '--target-percent': `${Math.min(100, Math.max(0, targetPercent))}%` } as CSSProperties}>{targetPercent}%</div><Typography.Text type="secondary">{targetLabel}</Typography.Text></div></SectionCard>
      <SectionCard title={recentTitle}>{recentRows.map((row) => <Typography.Text key={row} style={{ display: 'block', padding: 8 }}>{row}</Typography.Text>)}</SectionCard>
      <SectionCard title={sideTitle}>{sideRows.map((row) => <Typography.Text key={row} style={{ display: 'block', padding: 8 }}>{row}</Typography.Text>)}</SectionCard>
    </section>
  </section>
}
