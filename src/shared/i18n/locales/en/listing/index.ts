import catalog from './catalog.json'
import listingImageSync from './listingImageSync.json'

export default {
  ...listingImageSync,
  portal: {
    catalog,
  },
}
