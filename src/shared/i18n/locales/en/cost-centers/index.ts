import mapping from './mapping.json'
import portalVendors from './portalVendors.json'
import vendors from './vendors.json'

export default {
  ...mapping,
  ...vendors,
  portal: {
    vendors: portalVendors,
  },
}
