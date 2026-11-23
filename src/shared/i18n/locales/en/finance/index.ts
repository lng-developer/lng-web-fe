import finance from './finance.json'
import portalFinance from './portalFinance.json'

export default {
  ...finance,
  portal: {
    finance: portalFinance,
  },
}
