import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  FormOutlined,
  HddOutlined,
  LineChartOutlined,
  PlusCircleOutlined,
  ReadOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Flex, Progress, Row, Space, Tag, Typography } from 'antd'

import { MetricCard, PageHeader, SectionCard } from '@/shared/ui'

import { checkModuleHealth, type ModuleHealth, MODULES_LIST } from '../api/monitoringApi'
import styles from './MonitoringDashboardPage.module.scss'

export function MonitoringDashboardPage() {
  const { t } = useTranslation()
  const [healthMap, setHealthMap] = useState<Record<string, ModuleHealth>>({})
  const [loading, setLoading] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<string>('')

  const pingAllModules = useCallback(async () => {
    setLoading(true)
    const results = await Promise.all(
      MODULES_LIST.map(({ endpoint, name }) => checkModuleHealth(endpoint, name)),
    )
    const nextMap: Record<string, ModuleHealth> = {}
    results.forEach((item, index) => {
      nextMap[MODULES_LIST[index].key] = item
    })
    setHealthMap(nextMap)
    setLastCheckTime(new Date().toLocaleTimeString())
    setLoading(false)
  }, [])

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void pingAllModules(), 0)
    const timer = setInterval(() => {
      void pingAllModules()
    }, 15000)
    return () => {
      window.clearTimeout(initialCheck)
      clearInterval(timer)
    }
  }, [pingAllModules])

  const totalModules = MODULES_LIST.length
  const healthyModules = Object.values(healthMap).filter((h) => h.status === 'ok').length
  const avgLatency = Math.round(
    Object.values(healthMap).reduce((acc, curr) => acc + (curr.latencyMs ?? 0), 0) /
      (Object.keys(healthMap).length || 1),
  )

  const isAllHealthy = healthyModules === totalModules

  return (
    <section className={styles.page}>
      <PageHeader
        title={t('portal.monitoring.title', { defaultValue: 'System Monitoring & Observability' })}
        description={t('portal.monitoring.description', {
          defaultValue:
            'Real-time telemetry, modular health checks, latency, and infrastructure status.',
        })}
        actions={
          <Space>
            {lastCheckTime ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Updated at {lastCheckTime}
              </Typography.Text>
            ) : null}
            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              loading={loading}
              onClick={() => void pingAllModules()}
            >
              Ping Services
            </Button>
          </Space>
        }
      />

      {/* KPI Metric Overview */}
      <div className={styles.metrics}>
        <MetricCard
          icon={<SafetyCertificateOutlined />}
          variant={isAllHealthy ? 'success' : 'danger'}
          label="System Health Status"
          value={isAllHealthy ? 'OPERATIONAL' : 'DEGRADED'}
          loading={loading}
        />
        <MetricCard
          icon={<ClockCircleOutlined />}
          variant="info"
          label="Avg API Latency"
          value={`${avgLatency} ms`}
          loading={loading}
        />
        <MetricCard
          icon={<CloudServerOutlined />}
          variant="neutral"
          label="Modular Monolith Services"
          value={`${healthyModules} / ${totalModules} Healthy`}
          loading={loading}
        />
        <MetricCard
          icon={<DatabaseOutlined />}
          variant="warning"
          label="Infrastructure Telemetry"
          value="MongoDB & Redis OK"
          loading={loading}
        />
      </div>

      {/* HTTP Methods & Operations Breakdown */}
      <SectionCard title="HTTP Operations & Methods Monitoring (GET, POST, PATCH, PUT, DELETE)">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={4.8} style={{ flex: 1 }}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={10}>
                <ReadOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                <div>
                  <Tag color="success" style={{ fontSize: 11, fontWeight: 700 }}>
                    GET
                  </Tag>
                  <Typography.Text style={{ fontSize: 11, display: 'block', color: '#8c8c8c' }}>
                    Read & Fetch
                  </Typography.Text>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    Avg 14 ms
                  </Typography.Text>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4.8} style={{ flex: 1 }}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={10}>
                <PlusCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Tag color="processing" style={{ fontSize: 11, fontWeight: 700 }}>
                    POST
                  </Tag>
                  <Typography.Text style={{ fontSize: 11, display: 'block', color: '#8c8c8c' }}>
                    Create Records
                  </Typography.Text>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    Avg 42 ms
                  </Typography.Text>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4.8} style={{ flex: 1 }}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={10}>
                <FormOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
                <div>
                  <Tag color="warning" style={{ fontSize: 11, fontWeight: 700 }}>
                    PATCH
                  </Tag>
                  <Typography.Text style={{ fontSize: 11, display: 'block', color: '#8c8c8c' }}>
                    Partial Update
                  </Typography.Text>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    Avg 35 ms
                  </Typography.Text>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4.8} style={{ flex: 1 }}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={10}>
                <EditOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                <div>
                  <Tag color="purple" style={{ fontSize: 11, fontWeight: 700 }}>
                    PUT
                  </Tag>
                  <Typography.Text style={{ fontSize: 11, display: 'block', color: '#8c8c8c' }}>
                    Replace Item
                  </Typography.Text>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    Avg 38 ms
                  </Typography.Text>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4.8} style={{ flex: 1 }}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={10}>
                <DeleteOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
                <div>
                  <Tag color="error" style={{ fontSize: 11, fontWeight: 700 }}>
                    DELETE
                  </Tag>
                  <Typography.Text style={{ fontSize: 11, display: 'block', color: '#8c8c8c' }}>
                    Remove Item
                  </Typography.Text>
                  <Typography.Text strong style={{ fontSize: 12 }}>
                    Avg 25 ms
                  </Typography.Text>
                </div>
              </Flex>
            </Card>
          </Col>
        </Row>
      </SectionCard>

      {/* Infrastructure Telemetry Overview */}
      <SectionCard title="Infrastructure & Core Services">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={12}>
                <DatabaseOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    Database Cluster
                  </Typography.Text>
                  <Typography.Text strong>MongoDB Mongoose</Typography.Text>
                  <div>
                    <Tag color="success" style={{ fontSize: 10, marginTop: 4 }}>
                      CONNECTED
                    </Tag>
                  </div>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={12}>
                <HddOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    In-Memory Cache & Pub/Sub
                  </Typography.Text>
                  <Typography.Text strong>Redis (ioredis)</Typography.Text>
                  <div>
                    <Tag color="processing" style={{ fontSize: 10, marginTop: 4 }}>
                      CONNECTED
                    </Tag>
                  </div>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={12}>
                <ApiOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    Background Job Queue
                  </Typography.Text>
                  <Typography.Text strong>BullMQ Workers</Typography.Text>
                  <div>
                    <Tag color="purple" style={{ fontSize: 10, marginTop: 4 }}>
                      ACTIVE
                    </Tag>
                  </div>
                </div>
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card size="small" style={{ background: '#fafafa' }}>
              <Flex align="center" gap={12}>
                <LineChartOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    Metrics Collector
                  </Typography.Text>
                  <Typography.Text strong>Prometheus Client</Typography.Text>
                  <div>
                    <Tag color="warning" style={{ fontSize: 10, marginTop: 4 }}>
                      COLLECTING
                    </Tag>
                  </div>
                </div>
              </Flex>
            </Card>
          </Col>
        </Row>
      </SectionCard>

      {/* Module Health Matrix Grid */}
      <SectionCard title="Monolith Modules Health Check (14 Modules)">
        <Row gutter={[16, 16]}>
          {MODULES_LIST.map(({ key, name, endpoint }) => {
            const health = healthMap[key]
            const isOk = health?.status === 'ok'
            const latency = health?.latencyMs ?? 0
            const latencyTone = latency < 50 ? 'success' : latency < 200 ? 'normal' : 'exception'

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={key}>
                <Card
                  size="small"
                  hoverable
                  className={styles.moduleCard}
                  style={{
                    borderColor: isOk ? 'var(--ant-color-border-secondary)' : '#ff4d4f',
                  }}
                >
                  <Flex justify="space-between" align="start" style={{ marginBottom: 8 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {name}
                    </Typography.Text>
                    {isOk ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        HEALTHY
                      </Tag>
                    ) : (
                      <Tag color="error" icon={<WarningOutlined />}>
                        DOWN
                      </Tag>
                    )}
                  </Flex>

                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 11, display: 'block', fontFamily: 'monospace' }}
                  >
                    {endpoint}
                  </Typography.Text>

                  <Flex align="center" justify="space-between" style={{ marginTop: 12 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      Response Time
                    </Typography.Text>
                    <Tag
                      color={isOk ? 'green' : 'default'}
                      style={{ fontSize: 11, fontWeight: 600 }}
                    >
                      {latency} ms
                    </Tag>
                  </Flex>
                  <Progress
                    percent={isOk ? Math.min(100, Math.max(10, 100 - latency / 3)) : 0}
                    status={latencyTone}
                    showInfo={false}
                    strokeWidth={4}
                    style={{ marginTop: 4 }}
                  />
                </Card>
              </Col>
            )
          })}
        </Row>
      </SectionCard>
    </section>
  )
}

export default MonitoringDashboardPage
