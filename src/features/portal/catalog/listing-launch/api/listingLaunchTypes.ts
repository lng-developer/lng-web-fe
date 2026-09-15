export type Status = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
export type Page<T> = { items: T[]; total: number; page: number; limit: number }
export type Result = {
  detectedText: string
  theme: string
  designDescription: string
  suggestedKeyword: string
  warnings: string[]
}
export type Run = {
  id: string
  status: Status
  errorCode: string | null
  errorMessage: string | null
  validationErrors: Array<{ field: string; code: string; message: string }>
  usage: {
    inputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
  } | null
}
export type Analysis = Run & {
  launchId: string
  shopId: string
  requestKey: string
  mockupRevision: number
  result: Result | null
  isStale: boolean
}
export type Review = {
  sourceAnalysisRunId: string
  mockupConfirmed: true
  detectedText: string
  theme: string
  designDescription: string
}
export type Inputs = {
  profileCode: 'AMAZON_US_APPAREL_CONTENT_V1'
  keyword: string
  language: 'en-US'
  productFacts: {
    brand: string
    productName: string
    material: string
    features: string[]
    personalization?: string | null
    careInstructions?: string | null
  }
  availableColors: Array<{ code: string; label: string }>
  factsConfirmed: true
  designContext?: Omit<Review, 'mockupConfirmed'> & {
    assetId: string
    assetHash: string
    mockupRevision: number
    confirmedBy: string
    confirmedAt: string
  }
}
export type Content = {
  title: string
  bullets: string[]
  searchTerms: string[]
  recommendedColors: Array<{ code: string; reason: string }>
}
export type Version = {
  id: string
  version: number
  source: 'AI' | 'MANUAL'
  inputVersion: number
  content: Content
  isStale: boolean
  approvedContentUsable: boolean
}
export type Launch = {
  id: string
  shopId: string
  brief: string
  workingTitle: string | null
  state: 'BRIEF' | 'PRODUCT_SELECTED'
  marketplaceCode: string
  productTypeGroupId: string | null
  internalTemplateId: string | null
  contentInputVersion: number
  mockupRevision: number
  hasMockup?: boolean
  contentInputs: Inputs | null
  mockup: {
    assetId: string
    revision: number
    width: number
    height: number
    size: number
    downloadUrl: string
  } | null
  latestMockupAnalysis: Analysis | null
  mockupConfirmationUsable: boolean
  latestRun?: Run | null
  approvedContent: { versionId: string; selectedColorCodes: string[] } | null
  approvedContentUsable?: boolean
}
export type InputCommand = Omit<Inputs, 'designContext'> & {
  expectedInputVersion: number
  mockupReview?: Review
}
export type Intent = {
  requestKey: string
  expectedMockupRevision?: number
  expectedInputVersion?: number
}
