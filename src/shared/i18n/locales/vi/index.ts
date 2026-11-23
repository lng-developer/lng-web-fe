import common from './common'
import configuration from './configuration'
import costCenters from './cost-centers'
import finance from './finance'
import hr from './hr'
import listing from './listing'
import monitoring from './monitoring'
import orders from './orders'
import reports from './reports'
import teamTasks from './team-tasks'
import { deepMerge } from '../../deepMerge'

const vi = deepMerge(
  common,
  orders,
  teamTasks,
  listing,
  costCenters,
  reports,
  monitoring,
  configuration,
  finance,
  hr,
) as typeof common &
  typeof orders &
  typeof teamTasks &
  typeof listing &
  typeof costCenters &
  typeof reports &
  typeof monitoring &
  typeof configuration &
  typeof finance &
  typeof hr

export default vi
