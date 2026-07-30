import { redirect } from 'react-router-dom'

import { restoreSession } from './authApi'

export async function requireAuth() {
  try {
    await restoreSession()
    return null
  } catch {
    throw redirect('/login')
  }
}
