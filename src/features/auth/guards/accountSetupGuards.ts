import { redirect } from 'react-router-dom'

import { getCurrentAccount, restoreSession } from '../api/authApi'

async function loadSetupState() {
  try {
    const session = await restoreSession()
    if (session.account.mustChangePassword) {
      return { ...session, scopes: session.scopes ?? [], profileSetupRequired: true }
    }
    return await getCurrentAccount()
  } catch {
    throw redirect('/login')
  }
}

function setupDestination(state: Awaited<ReturnType<typeof loadSetupState>>) {
  if (state.account.mustChangePassword) return '/setup/password'
  if (state.profileSetupRequired) return '/setup/profile'
  return null
}

export async function requireWorkspace() {
  const state = await loadSetupState()
  const destination = setupDestination(state)
  if (destination) throw redirect(destination)
  return state
}

export async function requirePasswordSetup() {
  const state = await loadSetupState()
  const destination = setupDestination(state)
  if (destination !== '/setup/password') throw redirect(destination || '/operations-dashboard')
  return state
}

export async function requireProfileSetup() {
  const state = await loadSetupState()
  const destination = setupDestination(state)
  if (destination !== '/setup/profile') throw redirect(destination || '/operations-dashboard')
  return state
}
