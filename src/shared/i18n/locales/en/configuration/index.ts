import customization from './customization.json'
import extensions from './extensions.json'
import integrations from './integrations.json'
import shipments from './shipments.json'
import shops from './shops.json'

export default {
  ...customization,
  portal: {
    extensions,
    integrations,
    shipments,
    shops,
  },
}
