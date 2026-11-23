import design from './design.json'
import production from './production.json'
import teamTasks from './teamTasks.json'
import vendorSubmissions from './vendorSubmissions.json'
import workScores from './workScores.json'

export default {
  ...teamTasks,
  portal: {
    design,
    production,
    vendorSubmissions,
    workScores,
  },
}
