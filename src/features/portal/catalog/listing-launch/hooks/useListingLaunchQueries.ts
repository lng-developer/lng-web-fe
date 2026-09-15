import { useQuery } from '@tanstack/react-query'
import { getListingOptions } from '../../api/catalogApi'
import { getLaunch, listContentVersions, listLaunches } from '../api/listingLaunchApi'
import { listingLaunchKeys as keys } from '../api/listingLaunchKeys'
import { activeRun, useLaunchRunPolling } from './useLaunchRunPolling'
export const useLaunchOptions = () =>
  useQuery({ queryKey: ['catalog', 'listing-options'], queryFn: getListingOptions })
export const useLaunches = (params: Parameters<typeof listLaunches>[0]) =>
  useQuery({ queryKey: keys.list(params), queryFn: () => listLaunches(params) })
export function useLaunch(id: string) {
  const visible = useLaunchRunPolling()
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: ({ signal }) => getLaunch(id, { signal }),
    enabled: Boolean(id),
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      visible &&
      (activeRun(query.state.data?.latestRun?.status) ||
        activeRun(query.state.data?.latestMockupAnalysis?.status))
        ? 2000
        : false,
  })
}
export const useLaunchVersions = (id: string, page: number) =>
  useQuery({
    queryKey: keys.versions(id, page),
    queryFn: () => listContentVersions(id, { page, limit: 10 }),
  })
