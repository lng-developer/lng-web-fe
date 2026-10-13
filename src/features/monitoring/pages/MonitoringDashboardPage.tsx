import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClockCircleOutlined,
  CloudServerOutlined,
  CopyOutlined,
  DatabaseOutlined,
  HddOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  message,
  Progress,
  Result,
  Row,
  Select,
  Space,
  type TableColumnsType,
  Tooltip,
  Typography,
} from 'antd'

import { useSearchParams } from 'react-router-dom'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { AccessDeniedResult } from '@/shared/auth/AccessDeniedResult'
import { hasAnyPermission } from '@/shared/auth/permissions'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  DataFreshness,
  FormattedDateTime,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusTag,
  UiTabLabel,
  UiTabs,
  useDocumentTitle,
} from '@/shared/ui'

import {
  type MongoIndexUsageSnapshot,
  type SystemLogProcess,
  type SystemLogStream,
} from '../api/monitoringApi'
import { useMongoIndexSnapshotsQuery, useSystemHealthQuery, useSystemLogsQuery } from '../hooks'
import { getIndexReview } from '../utils/indexUsageReview'
import styles from './MonitoringDashboardPage.module.scss'

const MONITORING_TABS = ['health', 'workers', 'logs', 'mongo-indexes'] as const
type MonitoringTab = (typeof MONITORING_TABS)[number]

const statusTone = (status?: string) => {
  if (status === 'ok' || status === 'running' || status === 'CONNECTED' || status === 'ENABLED')
    return 'operational' as const
  if (status === 'external') return 'processing' as const
  if (status === 'disabled' || status === 'DISABLED') return 'draft' as const
  return 'critical' as const
}

type IndexRow = MongoIndexUsageSnapshot['collections'][number]['indexes'][number] & {
  collection: string
  usageAvailable: boolean
  classification: string
  idleDays: number
  candidate: boolean
}

function formatBytes(value = 0) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export const MonitoringDashboardPage = () => {
  const { t } = useTranslation()
  useDocumentTitle(t('shell.navigation.monitoring'))
  const statusLabel = useCallback(
    (status?: string) => {
      const normalized = String(status ?? 'unknown').toLowerCase()
      return t(`portal.monitoring.statuses.${normalized}`, { defaultValue: String(status ?? '') })
    },
    [t],
  )
  const canRead = hasAnyPermission(['AUDIT:READ'], { globalOnly: true })
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab: MonitoringTab =
    requestedTab && (MONITORING_TABS as readonly string[]).includes(requestedTab)
      ? (requestedTab as MonitoringTab)
      : 'health'

  const handleTabChange = useCallback(
    (nextTab: string) => {
      const nextParams = new URLSearchParams(searchParams)
      if (nextTab === 'health') {
        nextParams.delete('tab')
      } else {
        nextParams.set('tab', nextTab)
      }
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const [logProcess, setLogProcess] = useState<SystemLogProcess>('lng-web-be')
  const [logStream, setLogStream] = useState<SystemLogStream>('out')
  const [logLines, setLogLines] = useState(200)
  const [logFilter, setLogFilter] = useState('')
  const [indexSnapshotDate, setIndexSnapshotDate] = useState<string>()
  const [indexFilter, setIndexFilter] = useState<'ALL' | 'CANDIDATES'>('ALL')
  const [indexSearch, setIndexSearch] = useState('')
  const [indexPage, setIndexPage] = useState(1)
  const [indexPageSize, setIndexPageSize] = useState(DEFAULT_PAGE_SIZE)

  const {
    data: healthData,
    error: healthQueryError,
    isLoading: healthLoading,
    isFetching: healthFetching,
    refetch: refetchHealth,
  } = useSystemHealthQuery(canRead)
  const health = healthData?.data
  const latencyMs = healthData?.latencyMs ?? 0
  const loading = healthLoading || healthFetching
  const error = healthQueryError
    ? healthQueryError instanceof Error
      ? healthQueryError.message
      : t('portal.monitoring.healthCheckFailed')
    : undefined

  const logParams = useMemo(
    () => ({ process: logProcess, stream: logStream, lines: logLines }),
    [logProcess, logStream, logLines],
  )
  const {
    data: logs,
    error: logsQueryError,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useSystemLogsQuery(logParams, canRead)
  const logsError = logsQueryError
    ? logsQueryError instanceof Error
      ? logsQueryError.message
      : t('portal.monitoring.logsFailed')
    : undefined

  const {
    data: snapshotsData,
    error: snapshotsQueryError,
    isLoading: indexLoading,
    refetch: refetchIndexSnapshots,
  } = useMongoIndexSnapshotsQuery(30, canRead)
  const indexSnapshots = useMemo(() => snapshotsData ?? [], [snapshotsData])
  const indexError = snapshotsQueryError
    ? snapshotsQueryError instanceof Error
      ? snapshotsQueryError.message
      : t('portal.monitoring.indexes.loadFailed')
    : undefined

  const refresh = useCallback(async () => {
    if (!canRead) return
    await refetchHealth()
  }, [canRead, refetchHealth])

  const refreshLogs = useCallback(async () => {
    if (!canRead) return
    await refetchLogs()
  }, [canRead, refetchLogs])

  const refreshIndexSnapshots = useCallback(async () => {
    if (!canRead) return
    await refetchIndexSnapshots()
  }, [canRead, refetchIndexSnapshots])

  const modules = useMemo(() => health?.modules ?? [], [health?.modules])
  const queues = useMemo(() => health?.queues ?? [], [health?.queues])
  const workers = useMemo(() => health?.workers ?? [], [health?.workers])
  const healthyModules = useMemo(
    () => modules.filter((module) => module.status === 'ok').length,
    [modules],
  )
  const totalModules = modules.length
  const isHealthy = health?.status === 'ok' && !error
  const effectiveSnapshotDate = useMemo(() => {
    if (indexSnapshotDate && indexSnapshots.some((s) => s.capturedOn === indexSnapshotDate)) {
      return indexSnapshotDate
    }
    return indexSnapshots[0]?.capturedOn
  }, [indexSnapshotDate, indexSnapshots])

  const selectedIndexSnapshot = useMemo(
    () => indexSnapshots.find((snapshot) => snapshot.capturedOn === effectiveSnapshotDate),
    [indexSnapshots, effectiveSnapshotDate],
  )
  const allIndexRows: IndexRow[] = useMemo(
    () =>
      (selectedIndexSnapshot?.collections ?? []).flatMap((collection) =>
        collection.indexes.map((index) => ({
          ...index,
          collection: collection.name,
          usageAvailable: collection.usageAvailable,
          ...getIndexReview(index, collection.name, indexSnapshots),
        })),
      ),
    [selectedIndexSnapshot, indexSnapshots],
  )
  const indexRows = useMemo(() => {
    let list = allIndexRows
    if (indexFilter === 'CANDIDATES') {
      list = list.filter(({ candidate }) => candidate)
    }
    if (indexSearch.trim()) {
      const q = indexSearch.trim().toLowerCase()
      list = list.filter(
        (row) =>
          row.collection.toLowerCase().includes(q) ||
          row.name.toLowerCase().includes(q) ||
          JSON.stringify(row.key).toLowerCase().includes(q),
      )
    }
    return list
  }, [allIndexRows, indexFilter, indexSearch])

  const handleIndexFilterChange = useCallback((val: 'ALL' | 'CANDIDATES') => {
    setIndexFilter(val)
    setIndexPage(1)
  }, [])

  const handleIndexSearchChange = useCallback((val: string) => {
    setIndexSearch(val)
    setIndexPage(1)
  }, [])

  const handleSnapshotDateChange = useCallback((val?: string) => {
    setIndexSnapshotDate(val)
    setIndexPage(1)
  }, [])

  const indexColumns = useMemo<TableColumnsType<IndexRow>>(
    () => [
      {
        title: t('portal.monitoring.indexes.columns.collection'),
        dataIndex: 'collection',
        key: 'collection',
        sorter: (a, b) => a.collection.localeCompare(b.collection),
        render: (collection: string) => <Typography.Text strong>{collection}</Typography.Text>,
      },
      {
        title: t('portal.monitoring.indexes.columns.index'),
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string) => <Typography.Text code>{name}</Typography.Text>,
      },
      {
        title: t('portal.monitoring.indexes.columns.key'),
        dataIndex: 'key',
        key: 'key',
        render: (key) => <Typography.Text code>{JSON.stringify(key)}</Typography.Text>,
      },
      {
        title: t('portal.monitoring.indexes.columns.operations'),
        dataIndex: 'operations',
        key: 'operations',
        align: 'right',
        sorter: (a, b) => (Number(a.operations) || 0) - (Number(b.operations) || 0),
        render: (operations, row) =>
          row.usageAvailable && operations !== null ? Number(operations).toLocaleString() : '—',
      },
      {
        title: t('portal.monitoring.indexes.columns.idleDays'),
        dataIndex: 'idleDays',
        key: 'idleDays',
        align: 'right',
        sorter: (a, b) => a.idleDays - b.idleDays,
        render: (idleDays, row) =>
          row.usageAvailable
            ? t('portal.monitoring.indexes.idleDaysValue', { count: idleDays })
            : '—',
      },
      {
        title: t('portal.monitoring.indexes.columns.decision'),
        dataIndex: 'classification',
        key: 'classification',
        align: 'center',
        sorter: (a, b) => a.classification.localeCompare(b.classification),
        render: (classification, row) => (
          <StatusTag
            status={
              classification === 'KEEP' ? 'operational' : row.candidate ? 'critical' : 'warning'
            }
          >
            {classification}
          </StatusTag>
        ),
      },
    ],
    [t],
  )

  const logLinesList = useMemo(() => logs?.content ?? [], [logs?.content])
  const filteredLogLines = useMemo(() => {
    if (!logFilter.trim()) return logLinesList
    const query = logFilter.toLowerCase()
    return logLinesList.filter((line) => line.toLowerCase().includes(query))
  }, [logLinesList, logFilter])

  const handleCopyLogs = useCallback(() => {
    const text = filteredLogLines.join('\n')
    if (!text) return
    void navigator.clipboard.writeText(text).then(() => {
      void message.success(t('portal.monitoring.copied'))
    })
  }, [filteredLogLines, t])

  if (!canRead) return <AccessDeniedResult />

  const healthTab = (
    <>
      {error ? (
        <SectionCard title={t('portal.monitoring.healthCheckError')}>
          <Typography.Text type="danger">{error}</Typography.Text>
        </SectionCard>
      ) : null}

      <SectionCard title={t('portal.monitoring.infrastructure')}>
        <Row gutter={[16, 16]}>
          {[
            [
              t('portal.monitoring.infrastructureItems.mongo'),
              health?.infrastructure.mongo,
              <DatabaseOutlined key="mongo" />,
            ],
            [
              t('portal.monitoring.infrastructureItems.redis'),
              health?.infrastructure.redis,
              <HddOutlined key="redis" />,
            ],
            [
              t('portal.monitoring.infrastructureItems.metrics'),
              health?.infrastructure.metrics,
              <CloudServerOutlined key="metrics" />,
            ],
            [
              t('portal.monitoring.infrastructureItems.node'),
              health?.nodeVersion,
              <CloudServerOutlined key="node" />,
            ],
          ].map(([label, value, icon]) => (
            <Col xs={24} sm={12} md={6} key={String(label)}>
              <Card size="small">
                <Flex align="center" gap={12}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                      {label}
                    </Typography.Text>
                    <StatusTag status={statusTone(String(value))}>
                      {statusLabel(String(value))}
                    </StatusTag>
                  </div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title={t('portal.monitoring.realtimeSocket')}>
        <Row gutter={[16, 16]}>
          {[
            [t('portal.monitoring.status'), health?.realtime?.status ?? 'disabled'],
            [t('portal.monitoring.clients'), health?.realtime?.connectedClients ?? 0],
            [t('portal.monitoring.users'), health?.realtime?.authenticatedUsers ?? 0],
            [t('portal.monitoring.rooms'), health?.realtime?.rooms ?? 0],
            [t('portal.monitoring.authFailed'), health?.realtime?.authFailures ?? 0],
            [t('portal.monitoring.eventFailed'), health?.realtime?.eventFailures ?? 0],
          ].map(([label, value]) => (
            <Col xs={24} sm={12} md={8} lg={4} key={String(label)}>
              <Card size="small">
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {label}
                </Typography.Text>
                {label === t('portal.monitoring.status') ? (
                  <StatusTag status={statusTone(String(value))}>
                    {statusLabel(String(value))}
                  </StatusTag>
                ) : (
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {value}
                  </Typography.Title>
                )}
              </Card>
            </Col>
          ))}
        </Row>
        {health?.realtime?.lastErrorAt ? (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            {t('portal.monitoring.lastError', {
              message: health.realtime.lastErrorMessage,
              time: health.realtime.lastErrorAt,
            })}
          </Typography.Text>
        ) : null}
      </SectionCard>

      <SectionCard title={t('portal.monitoring.runtime')}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">
                {t('portal.monitoring.runtimeItems.uptime')}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: '4px 0 0' }}>
                {t('portal.monitoring.seconds', { count: health?.uptimeSeconds ?? 0 })}
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">
                {t('portal.monitoring.runtimeItems.heapUsed')}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: '4px 0 0' }}>
                {health?.memory.heapUsedMb ?? 0} MB
              </Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small">
              <Typography.Text type="secondary">
                {t('portal.monitoring.runtimeItems.rss')}
              </Typography.Text>
              <Typography.Title level={4} style={{ margin: '4px 0 0' }}>
                {health?.memory.rssMb ?? 0} MB
              </Typography.Title>
            </Card>
          </Col>
        </Row>
      </SectionCard>

      <SectionCard
        title={t('portal.monitoring.moduleHealth', {
          healthy: healthyModules,
          total: totalModules,
        })}
      >
        <Row gutter={[16, 16]}>
          {modules.map((module) => {
            const isOk = module.status === 'ok'
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={module.key}>
                <Card
                  size="small"
                  hoverable
                  className={`${styles.moduleCard} ${!isOk ? styles.moduleCardError : ''}`}
                >
                  <Flex justify="space-between" align="start" style={{ marginBottom: 8 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {module.name}
                    </Typography.Text>
                    <StatusTag status={isOk ? 'operational' : 'critical'}>
                      {statusLabel(module.status)}
                    </StatusTag>
                  </Flex>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                  >
                    {module.endpoint}
                  </Typography.Text>
                  <Progress
                    percent={isOk ? 100 : 0}
                    status={isOk ? 'success' : 'exception'}
                    showInfo={false}
                    strokeWidth={4}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              </Col>
            )
          })}
        </Row>
      </SectionCard>
    </>
  )

  const workersTab = (
    <>
      <SectionCard title={t('portal.monitoring.workers')}>
        <Row gutter={[16, 16]}>
          {workers.map((worker) => (
            <Col xs={24} sm={12} md={8} lg={6} key={worker.key}>
              <Card size="small">
                <Flex justify="space-between" align="start" gap={12}>
                  <div>
                    <Typography.Text strong>{worker.name}</Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                    >
                      {worker.queueName ?? worker.script ?? worker.process}
                    </Typography.Text>
                  </div>
                  <StatusTag status={statusTone(worker.status)}>
                    {statusLabel(worker.status)}
                  </StatusTag>
                </Flex>
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 11, marginTop: 8, display: 'block' }}
                >
                  {worker.process === 'embedded-api'
                    ? t('portal.monitoring.embeddedApiProcess')
                    : t('portal.monitoring.separatePm2Process')}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      <SectionCard title={t('portal.monitoring.queues')}>
        <Row gutter={[16, 16]}>
          {queues.map((queue) => (
            <Col xs={24} lg={12} key={queue.key}>
              <Card size="small" className={styles.queueCard}>
                <Flex justify="space-between" align="start" gap={12}>
                  <div>
                    <Typography.Text strong>{queue.name}</Typography.Text>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                    >
                      {queue.queueName}
                    </Typography.Text>
                  </div>
                  <StatusTag status={statusTone(queue.status)}>
                    {statusLabel(queue.status)}
                  </StatusTag>
                </Flex>
                <div className={styles.queueCounts}>
                  {(['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'] as const).map(
                    (key) => {
                      const count = queue.counts[key]
                      const isFailedAlert = key === 'failed' && count > 0
                      return (
                        <div
                          key={key}
                          className={`${styles.queueCountCell} ${isFailedAlert ? styles.queueCountFailed : ''}`}
                        >
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {t(`portal.monitoring.queueCounts.${key}`)}
                          </Typography.Text>
                          <Typography.Text strong>{count}</Typography.Text>
                        </div>
                      )
                    },
                  )}
                </div>
                {queue.error ? (
                  <Typography.Text type="danger" style={{ display: 'block', marginTop: 8 }}>
                    {queue.error}
                  </Typography.Text>
                ) : null}
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>
    </>
  )

  const logsTab = (
    <SectionCard title={t('portal.monitoring.serverLogs')}>
      <div className={styles.terminalContainer}>
        <div className={styles.terminalToolbar}>
          <Space wrap size="small">
            <Select
              aria-label={t('portal.monitoring.process')}
              style={{ width: 200 }}
              value={logProcess}
              options={[
                { label: t('portal.monitoring.backendApi'), value: 'lng-web-be' },
                { label: t('portal.monitoring.importWorkers'), value: 'lng-web-be-import-workers' },
                { label: t('portal.monitoring.devTunnel'), value: 'lng-web-be-dev-tunnel' },
              ]}
              onChange={setLogProcess}
            />
            <Select
              aria-label={t('portal.monitoring.stream')}
              style={{ width: 100 }}
              value={logStream}
              options={[
                { label: t('portal.monitoring.output'), value: 'out' },
                { label: t('portal.monitoring.error'), value: 'error' },
              ]}
              onChange={setLogStream}
            />
            <Select
              aria-label={t('portal.monitoring.lines')}
              style={{ width: 110 }}
              value={logLines}
              options={[100, 200, 500].map((value) => ({
                label: t('portal.monitoring.lineCount', { count: value }),
                value,
              }))}
              onChange={setLogLines}
            />
            <Button
              icon={<ReloadOutlined spin={logsLoading} />}
              loading={logsLoading}
              onClick={() => void refreshLogs()}
            >
              {t('portal.monitoring.refreshLogs')}
            </Button>
            {logs?.filename ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {logs.filename}
              </Typography.Text>
            ) : null}
          </Space>
          <Space wrap size="small">
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-quaternary)' }} />}
              placeholder={t('portal.monitoring.filterLogsPlaceholder')}
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              style={{ width: 220 }}
            />
            <Tooltip title={t('portal.monitoring.copyLogs')}>
              <Button icon={<CopyOutlined />} onClick={handleCopyLogs}>
                {t('portal.monitoring.copyLogs')}
              </Button>
            </Tooltip>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('portal.monitoring.filteredLinesCount', {
                count: filteredLogLines.length,
                total: logLinesList.length,
              })}
            </Typography.Text>
          </Space>
        </div>
        {logsError ? (
          <Typography.Text type="danger" style={{ padding: 16 }}>
            {logsError}
          </Typography.Text>
        ) : (
          <pre className={styles.logViewer}>
            {filteredLogLines.join('\n') || t('portal.monitoring.noLogLines')}
          </pre>
        )}
      </div>
    </SectionCard>
  )

  const indexToolbar = (
    <div className={styles.indexToolbar}>
      <Space wrap size="small">
        <Select
          aria-label={t('portal.monitoring.indexes.snapshotDate')}
          style={{ minWidth: 160 }}
          loading={indexLoading}
          value={effectiveSnapshotDate}
          options={indexSnapshots.map((snapshot) => ({
            label: snapshot.capturedOn,
            value: snapshot.capturedOn,
          }))}
          onChange={handleSnapshotDateChange}
        />
        <Select
          aria-label={t('portal.monitoring.indexes.filter')}
          style={{ minWidth: 160 }}
          value={indexFilter}
          options={[
            { label: t('portal.monitoring.indexes.allIndexes'), value: 'ALL' },
            { label: t('portal.monitoring.indexes.reviewCandidates'), value: 'CANDIDATES' },
          ]}
          onChange={handleIndexFilterChange}
        />
        <Button
          icon={<ReloadOutlined spin={indexLoading} />}
          loading={indexLoading}
          onClick={() => void refreshIndexSnapshots()}
        >
          {t('portal.monitoring.indexes.refresh')}
        </Button>
      </Space>
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: 'var(--ant-color-text-quaternary)' }} />}
        placeholder={t('portal.monitoring.indexes.searchPlaceholder')}
        value={indexSearch}
        onChange={(e) => handleIndexSearchChange(e.target.value)}
        style={{ width: 260 }}
      />
    </div>
  )

  const indexesTab = (
    <>
      <SectionCard title={t('portal.monitoring.indexes.title')}>
        {indexError ? <Typography.Text type="danger">{indexError}</Typography.Text> : null}
        {!indexError && !selectedIndexSnapshot ? (
          <Result status="info" title={t('portal.monitoring.indexes.empty')} />
        ) : null}
        {selectedIndexSnapshot ? (
          <>
            <Row gutter={[16, 16]} className="mb-4">
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<DatabaseOutlined />}
                  variant="info"
                  label={t('portal.monitoring.indexes.database')}
                  value={selectedIndexSnapshot.database}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<HddOutlined />}
                  variant="neutral"
                  label={t('portal.monitoring.indexes.indexes')}
                  value={selectedIndexSnapshot.totals.indexes.toLocaleString()}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<DatabaseOutlined />}
                  variant="neutral"
                  label={t('portal.monitoring.indexes.indexSize')}
                  value={formatBytes(selectedIndexSnapshot.totals.indexBytes)}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  icon={<ClockCircleOutlined />}
                  variant="neutral"
                  label={t('portal.monitoring.indexes.capturedAt')}
                  value={<FormattedDateTime value={selectedIndexSnapshot.capturedAt} />}
                />
              </Col>
            </Row>
            <CoreDataTable<IndexRow>
              toolbar={indexToolbar}
              rowKey={(row) => `${row.collection}:${row.name}`}
              columns={indexColumns}
              dataSource={indexRows}
              loading={indexLoading}
              pagination={{
                current: indexPage,
                pageSize: indexPageSize,
                total: indexRows.length,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (page, pageSize) => {
                  setIndexPage(page)
                  setIndexPageSize(pageSize)
                },
              }}
              scroll={{ x: 920 }}
              size="small"
            />
          </>
        ) : null}
      </SectionCard>
    </>
  )

  return (
    <section className={styles.page}>
      <PageHeader
        actions={
          <DataFreshness
            timestamp={health?.generatedAt}
            onRefresh={() => void refresh()}
            loading={loading}
          />
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            icon={<SafetyCertificateOutlined />}
            variant={isHealthy ? 'success' : 'danger'}
            label={t('portal.monitoring.systemHealth')}
            value={statusLabel(error ? 'unreachable' : isHealthy ? 'operational' : 'degraded')}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            icon={<ClockCircleOutlined />}
            variant="info"
            label={t('portal.monitoring.healthApiLatency')}
            value={`${latencyMs} ms`}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            icon={<CloudServerOutlined />}
            variant="neutral"
            label={t('portal.monitoring.modules')}
            value={t('portal.monitoring.healthyModules', {
              healthy: healthyModules,
              total: totalModules,
            })}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            icon={<DatabaseOutlined />}
            variant={health?.infrastructure.mongo === 'CONNECTED' ? 'success' : 'danger'}
            label={t('portal.monitoring.infrastructureItems.mongo')}
            value={statusLabel(health?.infrastructure.mongo)}
            loading={loading}
          />
        </Col>
      </Row>

      <UiTabs
        activeKey={activeTab}
        onChange={handleTabChange}
        destroyOnHidden={false}
        items={[
          {
            key: 'health',
            label: (
              <UiTabLabel active={activeTab === 'health'}>
                {t('portal.monitoring.health')}
              </UiTabLabel>
            ),
            children: healthTab,
          },
          {
            key: 'workers',
            label: (
              <UiTabLabel active={activeTab === 'workers'}>
                {t('portal.monitoring.workersAndQueues')}
              </UiTabLabel>
            ),
            children: workersTab,
          },
          {
            key: 'logs',
            label: (
              <UiTabLabel active={activeTab === 'logs'}>{t('portal.monitoring.logs')}</UiTabLabel>
            ),
            children: logsTab,
          },
          {
            key: 'mongo-indexes',
            label: (
              <UiTabLabel active={activeTab === 'mongo-indexes'}>
                {t('portal.monitoring.indexes.tab')}
              </UiTabLabel>
            ),
            children: indexesTab,
          },
        ]}
      />
    </section>
  )
}

export default MonitoringDashboardPage
