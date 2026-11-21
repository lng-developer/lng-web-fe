export const organizationKeys = {
  all: ['organization'] as const,
  departments: () => [...organizationKeys.all, 'departments'] as const,
  teams: () => [...organizationKeys.all, 'teams'] as const,
  teamMembers: (teamId: string) => [...organizationKeys.all, 'teams', teamId, 'members'] as const,
  memberCandidates: () => [...organizationKeys.all, 'member-candidates'] as const,
}
