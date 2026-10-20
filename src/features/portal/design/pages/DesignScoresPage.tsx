import type { CurrentAccount } from '@/features/auth/api/authApi'
import { WorkScoreWorkbenchPage } from '@/features/portal/work-scores/pages/WorkScoreWorkbenchPage'

export function DesignScoresPage({ account }: { readonly account?: CurrentAccount }) {
  return <WorkScoreWorkbenchPage account={account} scope="DESIGN" />
}

export default DesignScoresPage
