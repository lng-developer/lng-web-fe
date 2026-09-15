import { apiClient } from '@/shared/api'
import type {
  Analysis,
  Content,
  InputCommand,
  Launch,
  Page,
  Run,
  Version,
} from './listingLaunchTypes'
const endpoint = '/api/listing-launches'
const path = (id: string) => `${endpoint}/${encodeURIComponent(id)}`
const unwrap = <T>(response: unknown) => (response as { data: T }).data
export const listLaunches = async (params: {
  page: number
  limit: number
  shopId?: string
  state?: string
}) => unwrap<Page<Launch>>(await apiClient.get(endpoint, { params }))
export const getLaunch = async (id: string, options: { signal?: AbortSignal } = {}) =>
  unwrap<Launch>(await apiClient.get(path(id), options))
export const createLaunch = async (input: {
  shopId: string
  marketplaceCode: string
  brief: string
  workingTitle?: string
}) => unwrap<Launch>(await apiClient.post(endpoint, input))
export const updateLaunch = async (id: string, input: { brief?: string; workingTitle?: string }) =>
  unwrap<Launch>(await apiClient.patch(path(id), input))
export const selectLaunchProduct = async (
  id: string,
  input: { productTypeGroupId: string; internalTemplateId: string },
) => unwrap<Launch>(await apiClient.post(`${path(id)}/select-product`, input))
export async function uploadMockup(
  id: string,
  file: File,
  revisions: { expectedMockupRevision: number; expectedInputVersion: number },
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {},
) {
  const form = new FormData()
  form.append('file', file)
  form.append('expectedMockupRevision', String(revisions.expectedMockupRevision))
  form.append('expectedInputVersion', String(revisions.expectedInputVersion))
  return unwrap<Launch>(
    await apiClient.post(`${path(id)}/mockup`, form, {
      signal: options.signal,
      timeout: 120000,
      onUploadProgress: (e) => options.onProgress?.(Math.round((e.progress || 0) * 100)),
    }),
  )
}
export type Dispatch<T> = {
  success: boolean
  data: T
  replayed?: boolean
  dispatchWarning?: string
}
export const requestMockupAnalysis = async (
  id: string,
  input: { requestKey: string; expectedMockupRevision: number },
) => (await apiClient.post(`${path(id)}/mockup-analyses`, input)) as unknown as Dispatch<Analysis>
export const getMockupAnalysis = async (
  id: string,
  runId: string,
  options: { signal?: AbortSignal } = {},
) =>
  unwrap<Analysis>(
    await apiClient.get(`${path(id)}/mockup-analyses/${encodeURIComponent(runId)}`, options),
  )
export const saveLaunchInputs = async (id: string, input: InputCommand) =>
  unwrap<Launch>(await apiClient.put(`${path(id)}/content-inputs`, input))
export const requestContentGeneration = async (
  id: string,
  input: { requestKey: string; expectedInputVersion: number },
) => (await apiClient.post(`${path(id)}/content-generations`, input)) as unknown as Dispatch<Run>
export const getContentGeneration = async (
  id: string,
  runId: string,
  options: { signal?: AbortSignal } = {},
) =>
  unwrap<Run>(
    await apiClient.get(`${path(id)}/content-generations/${encodeURIComponent(runId)}`, options),
  )
export const listContentVersions = async (id: string, params: { page: number; limit: number }) =>
  unwrap<Page<Version>>(await apiClient.get(`${path(id)}/content-versions`, { params }))
export const createContentRevision = async (id: string, versionId: string, content: Content) =>
  unwrap<Version>(
    await apiClient.post(
      `${path(id)}/content-versions/${encodeURIComponent(versionId)}/revisions`,
      content,
    ),
  )
export const approveContentVersion = async (
  id: string,
  versionId: string,
  input: { expectedInputVersion: number; selectedColorCodes: string[] },
) =>
  unwrap<Launch>(
    await apiClient.post(
      `${path(id)}/content-versions/${encodeURIComponent(versionId)}/approve`,
      input,
    ),
  )
