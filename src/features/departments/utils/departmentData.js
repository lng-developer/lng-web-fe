export const FAKE_DEPARTMENTS = [
  {
    id: 'dept-qc',
    code: 'DEPT-QC',
    name: 'QC',
    teamCount: 2,
    memberCount: 38,
    status: 'active',
    teams: [
      {
        id: 'team-qc-01',
        code: 'TEAM-QC-01',
        name: 'QC Team A',
        leaderCount: 2,
        staffCount: 18,
        status: 'active',
      },
      {
        id: 'team-qc-02',
        code: 'TEAM-QC-02',
        name: 'QC Team B',
        leaderCount: 1,
        staffCount: 14,
        status: 'active',
      },
    ],
  },
  {
    id: 'dept-design',
    code: 'DEPT-DESIGN',
    name: 'Design',
    teamCount: 2,
    memberCount: 22,
    status: 'active',
    teams: [],
  },
  {
    id: 'dept-fulfillment',
    code: 'DEPT-FULFILLMENT',
    name: 'Fulfillment',
    teamCount: 2,
    memberCount: 64,
    status: 'active',
    teams: [],
  },
]

export function buildDepartmentSummary(departments) {
  return departments.reduce(
    (summary, department) => ({
      totalDepartments: summary.totalDepartments + 1,
      totalMembers: summary.totalMembers + department.memberCount,
      activeDepartments: summary.activeDepartments + (department.status === 'active' ? 1 : 0),
    }),
    { totalDepartments: 0, totalMembers: 0, activeDepartments: 0 },
  )
}

export function getTeamsByDepartmentCode(departments, departmentCode) {
  return departments.find((department) => department.code === departmentCode)?.teams ?? []
}
