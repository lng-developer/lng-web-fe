export const listingLaunchKeys = {
  all: ['listing-launch'] as const,
  detail: (id: string) => ['listing-launch', id] as const,
  list: (params: object) => ['listing-launch', 'list', params] as const,
  versions: (id: string, page: number) => ['listing-launch', id, 'versions', page] as const,
}
