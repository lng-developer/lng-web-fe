export const reportsKeys = {
  all: ['reports'],
  dailyProfit: (query = {}) => [...reportsKeys.all, 'finance', 'daily-profit', query],
  bySeller: (query = {}) => [...reportsKeys.all, 'finance', 'by-seller', query],
  byTeam: (query = {}) => [...reportsKeys.all, 'finance', 'by-team', query],
}
