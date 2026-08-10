import type {
  ImportJobListParams,
  IssueListParams,
  PageParams,
  RawRecordListParams,
} from './integrationApi'

export const integrationKeys = {
  all: ['portal', 'integrations'] as const,
  jobs: (params: ImportJobListParams) => [...integrationKeys.all, 'jobs', params] as const,
  job: (jobId: string) => [...integrationKeys.all, 'job', jobId] as const,
  jobProgress: (jobId: string) => [...integrationKeys.job(jobId), 'progress'] as const,
  issues: (params: IssueListParams) => [...integrationKeys.all, 'issues', params] as const,
  jobIssues: (jobId: string, params: PageParams) =>
    [...integrationKeys.job(jobId), 'issues', params] as const,
  rawRecords: (jobId: string, params: RawRecordListParams) =>
    [...integrationKeys.job(jobId), 'raw-records', params] as const,
}
