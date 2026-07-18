import { BACKEND_ENDPOINTS } from '@/features/api-coverage/data/backendEndpoints'

function endpoint(method, path) {
  const match = BACKEND_ENDPOINTS.find((item) => item.method === method && item.path === path)
  if (!match) throw new Error(`Missing backend endpoint: ${method} ${path}`)
  return match
}

function action(label, method, path, body = '{}') {
  return { body, endpoint: endpoint(method, path), label }
}

export const API_WORKFLOWS = {
  shipping: {
    id: 'shipping',
    title: 'Shipping & Vendor Submissions',
    description:
      'Vendor payloads, submission lifecycle, shipment creation, tracking, and webhook logs.',
    tabs: [
      {
        id: 'vendor-submissions',
        label: 'Vendor Submissions',
        listEndpoint: endpoint('GET', '/api/vendor-submissions'),
        detailEndpoint: endpoint('GET', '/api/vendor-submissions/:id'),
        actions: [
          action('Summary', 'GET', '/api/vendor-submissions/summary'),
          action('Submit to vendor', 'POST', '/api/vendor-submissions/:id/submit-to-vendor'),
          action(
            'Recheck ready tasks',
            'POST',
            '/api/vendor-submissions/recheck-ready-production-tasks',
          ),
          action(
            'Create from production task',
            'POST',
            '/api/vendor-submissions/from-production-tasks/:productionTaskId',
          ),
          action('Preview payload', 'GET', '/api/vendor-submissions/:id/payload-preview'),
          action('Mark submitted', 'POST', '/api/vendor-submissions/:id/mark-submitted'),
          action('Mark failed', 'POST', '/api/vendor-submissions/:id/mark-failed', '{"reason":""}'),
          action('Retry', 'POST', '/api/vendor-submissions/:id/retry'),
          action('Cancel', 'POST', '/api/vendor-submissions/:id/cancel', '{"reason":""}'),
        ],
      },
      {
        id: 'shipments',
        label: 'Shipments',
        listEndpoint: endpoint('GET', '/api/shipments'),
        detailEndpoint: endpoint('GET', '/api/shipments/:id'),
        actions: [
          action('Summary', 'GET', '/api/shipments/summary'),
          action(
            'Create shipment',
            'POST',
            '/api/shipments/from-vendor-submissions/:vendorSubmissionId',
          ),
          action('By order item', 'GET', '/api/shipments/order-items/:orderItemId'),
          action(
            'Update tracking',
            'PATCH',
            '/api/shipments/:id/tracking',
            '{"trackingNumber":"","carrierCode":"","trackingUrl":""}',
          ),
          action('Update status', 'PATCH', '/api/shipments/:id/status', '{"status":""}'),
          action('Recheck vendor tracking', 'POST', '/api/shipments/vendor-tracking/recheck'),
          action(
            'Recheck submitted tracking',
            'POST',
            '/api/shipments/vendor-tracking/recheck-submitted',
          ),
        ],
      },
      {
        id: 'vendor-integration',
        label: 'Vendor Integration',
        listEndpoint: endpoint('GET', '/api/vendors'),
        actions: [
          action('Get integration', 'GET', '/api/vendors/:vendorId/integration'),
          action(
            'Update integration',
            'PATCH',
            '/api/vendors/:vendorId/integration',
            '{"providerCode":"","status":"ACTIVE"}',
          ),
          action('Refresh credential', 'POST', '/api/vendors/:vendorId/integration/refresh'),
        ],
      },
      {
        id: 'webhooks',
        label: 'Webhook Logs',
        listEndpoint: endpoint('GET', '/api/shipments/vendor-webhooks/logs'),
        actions: [
          action('Provider config', 'GET', '/api/shipments/vendor-webhooks/:provider'),
          action('Post provider webhook', 'POST', '/api/shipments/vendor-webhooks/:provider'),
        ],
      },
    ],
  },
  mapping: {
    id: 'mapping',
    title: 'Mapping Workbench',
    description: 'Rule maintenance and order item mapping actions.',
    tabs: [
      {
        id: 'resolve',
        label: 'Resolve Queue',
        listEndpoint: endpoint('GET', '/api/mapping/config-workbench'),
        actions: [
          action('Summary', 'GET', '/api/mapping/summary'),
          action('Recheck unmatched', 'POST', '/api/mapping/recheck-unmatched'),
          action('Preview item', 'POST', '/api/mapping/order-items/:orderItemId/preview'),
          action(
            'Search candidates',
            'POST',
            '/api/mapping/order-items/:orderItemId/vendor-candidates/search',
            '{"q":""}',
          ),
          action('Resolve', 'POST', '/api/mapping/order-items/:orderItemId/resolve'),
          action('Recheck item', 'POST', '/api/mapping/order-items/:orderItemId/recheck'),
          action('Select candidate', 'POST', '/api/mapping/order-items/:orderItemId/select'),
          action('Confirm mapping', 'POST', '/api/mapping/order-items/:orderItemId/confirm'),
          action('Get plan', 'GET', '/api/mapping/order-items/:orderItemId/plan'),
        ],
      },
      {
        id: 'rules',
        label: 'Rules',
        listEndpoint: endpoint('GET', '/api/mapping/value-aliases'),
        detailEndpoint: endpoint('GET', '/api/mapping/value-aliases/:id'),
        actions: [
          action('Create value alias', 'POST', '/api/mapping/value-aliases'),
          action('Update value alias', 'PATCH', '/api/mapping/value-aliases/:id'),
          action('Create normalization', 'POST', '/api/mapping/normalization-rules'),
          action('Update normalization', 'PATCH', '/api/mapping/normalization-rules/:id'),
          action('Create semantic', 'POST', '/api/mapping/semantic-rules'),
          action('Update semantic', 'PATCH', '/api/mapping/semantic-rules/:id'),
          action('Create SKU config', 'POST', '/api/mapping/sku-config-rules'),
          action('Update SKU config', 'PATCH', '/api/mapping/sku-config-rules/:id'),
          action('Create SKU normalize', 'POST', '/api/mapping/sku-normalize-rules'),
          action('Update SKU normalize', 'PATCH', '/api/mapping/sku-normalize-rules/:id'),
        ],
      },
      {
        id: 'vendor-routing',
        label: 'Vendor Routing',
        listEndpoint: endpoint('GET', '/api/mapping/vendor-routing-rules'),
        detailEndpoint: endpoint('GET', '/api/mapping/vendor-routing-rules/:id'),
        actions: [
          action('Create route', 'POST', '/api/mapping/vendor-routing-rules'),
          action('Update route', 'PATCH', '/api/mapping/vendor-routing-rules/:id'),
          action(
            'Reorder routes',
            'PATCH',
            '/api/mapping/vendor-routing-rules/reorder',
            '{"productTypeGroupId":"","vendorRanks":[{"vendorId":"","priority":1}]}',
          ),
        ],
      },
    ],
  },
  finance: {
    id: 'finance',
    title: 'Finance Reconciliation',
    description: 'Finance imports, snapshots, recalculation, and order summaries.',
    tabs: [
      {
        id: 'snapshots',
        label: 'Snapshots',
        listEndpoint: endpoint('GET', '/api/finance/snapshots'),
        actions: [
          action('Import transactions', 'POST', '/api/finance/imports/transactions'),
          action('Import settlements', 'POST', '/api/finance/imports/settlements'),
          action('Import ads', 'POST', '/api/finance/imports/ads'),
          action('Item snapshot', 'GET', '/api/finance/order-items/:orderItemId/snapshot'),
          action('Recalculate item', 'POST', '/api/finance/order-items/:orderItemId/recalculate'),
          action('Recalculate order', 'POST', '/api/finance/orders/:orderId/recalculate'),
          action('Order summary', 'GET', '/api/finance/orders/:orderId/summary'),
        ],
      },
    ],
  },
  reports: {
    id: 'reports',
    title: 'Reports',
    description: 'Finance, vendor, and operations reports.',
    tabs: [
      {
        id: 'finance-daily',
        label: 'Finance Daily',
        listEndpoint: endpoint('GET', '/api/reports/finance/daily'),
        actions: [],
      },
      {
        id: 'finance-seller',
        label: 'Finance By Seller',
        listEndpoint: endpoint('GET', '/api/reports/finance/by-seller'),
        actions: [],
      },
      {
        id: 'finance-team',
        label: 'Finance By Team',
        listEndpoint: endpoint('GET', '/api/reports/finance/by-team'),
        actions: [],
      },
      {
        id: 'vendor-performance',
        label: 'Vendor Performance',
        listEndpoint: endpoint('GET', '/api/reports/vendor/performance'),
        actions: [],
      },
      {
        id: 'operations',
        label: 'Operations Overview',
        listEndpoint: endpoint('GET', '/api/reports/operations/overview'),
        actions: [],
      },
    ],
  },
}
