import audit from './audit.json'
import monitoring from './monitoring.json'

export default {
  ...audit,
  portal: {
    monitoring,
  },
}
