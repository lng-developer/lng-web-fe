export const reportsKeys = {
  all: ['reports'],
  adsChannelPerformance: (query = {}) => [...reportsKeys.all, 'ads', 'channel-performance', query],
  buyerInsights: (query = {}) => [...reportsKeys.all, 'buyers', 'insights', query],
  dailyProfit: (query = {}) => [...reportsKeys.all, 'finance', 'daily-profit', query],
  bySeller: (query = {}) => [...reportsKeys.all, 'finance', 'by-seller', query],
  byTeam: (query = {}) => [...reportsKeys.all, 'finance', 'by-team', query],
  operationsOverview: (query = {}) => [...reportsKeys.all, 'operations', 'overview', query],
  vendorPerformance: (query = {}) => [...reportsKeys.all, 'vendor', 'performance', query],
}
