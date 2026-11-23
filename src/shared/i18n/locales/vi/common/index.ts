import auth from './auth.json'
import chat from './chat.json'
import common from './common.json'
import customers from './customers.json'
import media from './media.json'
import organization from './organization.json'

export default {
  ...common,
  ...auth,
  ...organization,
  ...chat,
  ...customers,
  ...media,
}
