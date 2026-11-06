# Giai Đoạn 1: Hotfixes Sự Cố & Bảo Mật Kiến Trúc (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục triệt để các lỗ hổng nghiêm trọng và lỗi vận hành cốt tử đã phát hiện trong quá trình Audit: sửa chuỗi mock cẩu thả trong i18n, chuẩn hóa Query Key Chấm công (Attendance), bổ sung test cho Google SSO & System module, nâng cấp cơ chế Refresh Token 401 tự động, thêm ErrorBoundary chống sập trắng toàn trang, bọc bảo vệ Route Chat và lazy-load Recharts để giảm tải initial bundle.

**Architecture:** Áp dụng phương pháp phân rã module độc lập: các tác vụ sửa i18n, query key và viết test độc lập (Tasks 1, 2, 3) được thực thi song song; các tác vụ đụng chạm vào core HTTP client, ErrorBoundary và routing shell (Tasks 4, 5, 6) được thực thi tuần tự kèm test xác thực.

**Tech Stack:** React 19, TypeScript, Ant Design v6, TanStack Query v5, Axios, Vitest, React Testing Library.

**Spec:** [master-frontend-audit-report.md](file:///home/adminhieungo/.gemini/antigravity/brain/a438c683-706d-4778-ab40-6dbf4b7a4af1/master-frontend-audit-report.md)

## Global Constraints

- Tech Stack thực tế của dự án là Ant Design v6 + SCSS Modules + TanStack Query 5. Tuyệt đối không cài đặt hay import Tailwind, MUI, hay thư viện lạ nào.
- Toàn bộ copy UI phải qua `t(...)` trong `src/shared/i18n/locales/*/common.json`, đồng bộ cả tiếng Anh và tiếng Việt.
- Mọi thay đổi code phải vượt qua kiểm tra tĩnh: `npm run lint` và `npm run build`.

## Review Focus

- Token 401 Interceptor: Không được tạo vòng lặp vô hạn (infinite loop) khi chính request refresh token bị 401.
- Invalidation Attendance Query: Đảm bảo sau khi gọi `refresh()` trong `useAttendance.tsx`, query `records` thực sự được refetch.
- Error Boundary: Khi một component con trong `<Outlet />` ném exception, AppShell (Header, Sidebar, Profile) phải giữ nguyên vẹn.
- Router Bundle: Recharts không được xuất hiện trong main entry bundle chunk sau khi build.

---

### Task 1: Sửa chuỗi mock i18n (`errors.serverTitle`) và bổ sung các missing keys

**Files:**

- Modify: `src/shared/i18n/locales/en/common.json:4962`
- Modify: `src/shared/i18n/locales/vi/common.json:4962`
- Modify: `src/features/portal/work-scores/pages/WorkScoreWorkbenchPage.tsx:308, 661, 678`
- Modify: `src/features/foundation/OperationsDashboardPage.tsx:163, 240, 261, 276`

**Interfaces:**

- Consumes: `useTranslation` từ `react-i18next`
- Produces: Chuẩn hóa key `errors.serverTitle`, thêm `portal.workScores.fields.taskType`, `portal.workScores.filters.allTaskTypes`, `portal.workScores.filters.allDifficulties`, `foundation.portalDashboard.grossProfit`, `foundation.portalDashboard.revenueByChannel`, `foundation.portalDashboard.revenueAndProfit`.

- [ ] **Step 1: Cập nhật file locale `en/common.json` và `vi/common.json`**
  - Đổi `"serverTitle": "Anh em đợi tôi :))"` thành `"serverTitle": "Internal Server Error"` trong `en/common.json`.
  - Đổi `"serverTitle": "Anh em đợi tôi :))"` thành `"serverTitle": "Hệ thống đang gặp sự cố"` trong `vi/common.json`.
  - Bổ sung các key bị thiếu vào mục tương ứng trong cả hai file:
    ```json
    "portal": {
      "workScores": {
        "fields": { "taskType": "Task Type" },
        "filters": {
          "allTaskTypes": "All Task Types",
          "allDifficulties": "All Difficulties"
        }
      }
    },
    "foundation": {
      "portalDashboard": {
        "grossProfit": "Gross Profit",
        "revenueByChannel": "Revenue by Channel",
        "revenueAndProfit": "Revenue and Profit"
      }
    }
    ```
    (và bản dịch tiếng Việt tương ứng).

- [ ] **Step 2: Dọn dẹp defaultValue trong code components**
  - Trong `WorkScoreWorkbenchPage.tsx`: Bỏ các chuỗi fallback cứng tiếng Việt, chỉ gọi `t('portal.workScores.fields.taskType')`, `t('portal.workScores.filters.allTaskTypes')`.
  - Trong `OperationsDashboardPage.tsx`: Gọi `t('foundation.portalDashboard.grossProfit')`, v.v.

- [ ] **Step 3: Kiểm tra JSON hợp lệ và chạy lint**
  - Chạy `npm run lint` để đảm bảo không có lỗi cú pháp hoặc định dạng.

- [ ] **Step 4: Commit**
  ```bash
  git add src/shared/i18n/locales/ src/features/portal/work-scores/ src/features/foundation/
  git commit -m "fix(i18n): correct serverTitle copy and add missing ghost keys"
  ```

---

### Task 2: Chuẩn hóa cấu trúc phân cấp Query Key trong Chấm công (Attendance)

**Files:**

- Modify: `src/features/hr/api/hrKeys.ts:42`
- Modify: `src/features/hr/pages/Attendance/useAttendance.tsx:64, 94`
- Test: `src/test/hr/Attendance/useAttendance.test.tsx` (nếu có) hoặc chạy test liên quan.

**Interfaces:**

- Consumes: `hrKeys`, `useQueryClient`
- Produces: Query key đồng nhất phân cấp: `['hr-time', 'attendance', workspace, range]`.

- [ ] **Step 1: Viết test hoặc kiểm tra test hiện tại của useAttendance**
      Kiểm tra file test `src/test/hr/Attendance` nếu có. Đảm bảo assertion xác nhận key invalidate bao trùm query records.

- [ ] **Step 2: Cập nhật `hrKeys.ts`**
      Đổi định nghĩa:

  ```typescript
  timeAttendance: (workspace?: string, params?: unknown) =>
    ['hr-time', 'attendance', workspace, params].filter(Boolean) as const,
  ```

- [ ] **Step 3: Cập nhật `useAttendance.tsx`**
  - Sửa dòng 64: `queryKey: ['hr-time', 'attendance', workspace, range]`
  - Giữ nguyên dòng 94: `queryClient.invalidateQueries({ queryKey: ['hr-time', 'attendance'] })`
  - Bây giờ prefix `['hr-time', 'attendance']` sẽ khớp chính xác với `['hr-time', 'attendance', workspace, range]`, giúp bảng tự động cập nhật sau khi Vào/Ra ca!
  - Xóa bỏ dead query `listAttendanceMatrix` ở dòng 57 nếu không dùng hoặc comment ghi rõ lý do.

- [ ] **Step 4: Chạy test kiểm tra**
      Run: `npx vitest run src/test/hr/`
      Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/hr/api/hrKeys.ts src/features/hr/pages/Attendance/useAttendance.tsx
  git commit -m "fix(hr): correct attendance query key hierarchy for proper cache invalidation"
  ```

---

### Task 3: Bổ sung Test Guards cho Google Login SSO và System Module

**Files:**

- Create: `src/test/auth/google/useGoogleLoginHandler.test.tsx`
- Create: `src/test/features/system/SystemDashboardPage.test.tsx`
- Create: `src/test/features/system/systemDashboardApi.test.ts`

**Interfaces:**

- Consumes: `@/features/auth/google/useGoogleLoginHandler`, `@/features/system/pages/SystemDashboardPage`, `@/features/system/api/systemDashboardApi`
- Produces: Test coverage vững chắc cho luồng SSO Google và module System.

- [ ] **Step 1: Tạo file test `useGoogleLoginHandler.test.tsx`**
  - Mock `window.google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn(), prompt: vi.fn() } } }`.
  - Mock `apiClient.post` để giả lập response exchange token Google -> session.
  - Assert hook render đúng, gọi callback login, cập nhật session và navigate tới `/portal/dashboard`.

- [ ] **Step 2: Tạo test cho `systemDashboardApi.test.ts` và `SystemDashboardPage.test.tsx`**
  - Test `getSystemDashboardOverview()` gọi đúng endpoint `/api/system/overview`.
  - Test `SystemDashboardPage` render các card trạng thái dịch vụ và version.

- [ ] **Step 3: Chạy test xác nhận kết quả pass**
      Run: `npx vitest run src/test/auth/google/useGoogleLoginHandler.test.tsx src/test/features/system/`
      Expected: 100% PASS

- [ ] **Step 4: Commit**
  ```bash
  git add src/test/auth/google/ src/test/features/system/
  git commit -m "test: add missing tests for google login handler and system module"
  ```

---

### Task 4: Nâng cấp Axios 401 Interceptor hỗ trợ Refresh Token Mutex Queue

**Files:**

- Modify: `src/shared/api/client.ts:32-42`
- Modify: `src/test/shared/api/client.test.ts`

**Interfaces:**

- Consumes: `hasRefreshSession()`, `expireSession()`, `setAccessToken()`, `getAccessToken()`
- Produces: Axios interceptor tự động refresh token qua `/api/auth/refresh`, lưu hàng đợi requests và retry khi có token mới.

- [ ] **Step 1: Cập nhật test case trong `src/test/shared/api/client.test.ts`**
  - Thêm test case: Khi request trả về 401 và có refresh session, interceptor tự động gọi `/api/auth/refresh`, nhận token mới và retry request ban đầu.
  - Thêm test case: Khi `/api/auth/refresh` trả về 401/400, interceptor gọi `expireSession()` và bắn sự kiện `auth:session-expired`.

- [ ] **Step 2: Cài đặt Refresh Token Mutex trong `src/shared/api/client.ts`**
  - Khai báo:

    ```typescript
    let isRefreshing = false
    let failedQueue: Array<{
      resolve: (token: string) => void
      reject: (error: unknown) => void
    }> = []

    const processQueue = (error: unknown, token: string | null = null) => {
      failedQueue.forEach((promise) => {
        if (error) promise.reject(error)
        else if (token) promise.resolve(token)
      })
      failedQueue = []
    }
    ```

  - Trong `response.use` error handler:
    - Nếu `apiError.status === 401`:
      - Nếu `requestUrl === '/api/auth/refresh'` hoặc `requestUrl === '/api/auth/login'`: gọi `expireSession()`, return reject.
      - Nếu `originalRequest._retry`: gọi `expireSession()`, return reject.
      - Nếu `hasRefreshSession()`:
        - Đánh dấu `originalRequest._retry = true`.
        - Nếu `isRefreshing`: đẩy promise retry vào `failedQueue`.
        - Nếu chưa refresh: đặt `isRefreshing = true`, gọi `apiClient.post('/api/auth/refresh')`.
        - Khi refresh thành công: lấy new token, `setAccessToken(newAccessToken)`, `processQueue(null, newAccessToken)`, cập nhật header `Authorization` của `originalRequest` và retry bằng `apiClient(originalRequest)`.
        - Khi refresh thất bại: `processQueue(refreshError, null)`, `expireSession()`, reject lỗi.

- [ ] **Step 3: Chạy test xác nhận**
      Run: `npx vitest run src/test/shared/api/client.test.ts`
      Expected: All tests pass.

- [ ] **Step 4: Commit**
  ```bash
  git add src/shared/api/client.ts src/test/shared/api/client.test.ts
  git commit -m "feat(api): implement auto refresh token queue in axios interceptor"
  ```

---

### Task 5: Xây dựng ContentErrorBoundary & GlobalErrorBoundary bảo vệ ứng dụng

**Files:**

- Create: `src/shared/ui/ContentErrorBoundary.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/app/bootstrap.tsx:9-16`
- Modify: `src/app/layout/AppShell.tsx:208-212`
- Create: `src/test/shared/ui/ContentErrorBoundary.test.tsx`

**Interfaces:**

- Consumes: React `Component`, Ant Design `Result`, `Button`
- Produces: `<ContentErrorBoundary>`, `<GlobalErrorBoundary>` bọc ứng dụng và vùng `<Outlet />`.

- [ ] **Step 1: Tạo `ContentErrorBoundary.tsx`**
  - Component React class chuẩn `ErrorBoundary` nhận `children` và `fallback?: ReactNode`.
  - `componentDidCatch(error, errorInfo)`: log lỗi ra console trong dev mode.
  - Khi có lỗi: hiển thị thẻ `Result` với `status="error"`, tiêu đề `"Không thể tải nội dung trang"`, mô tả ngắn kèm nút `"Thử lại"` gọi `this.setState({ hasError: false })`.

- [ ] **Step 2: Viết unit test cho `ContentErrorBoundary`**
  - Test kịch bản component con throw exception: boundary bắt lỗi, hiển thị UI lỗi, bấm Thử lại để reset.
    Run: `npx vitest run src/test/shared/ui/ContentErrorBoundary.test.tsx`
    Expected: PASS

- [ ] **Step 3: Tích hợp vào `AppShell.tsx` và `bootstrap.tsx`**
  - Trong `AppShell.tsx`:
    ```tsx
    <div className={`${styles.workspace} ${isFixedWorkspace ? styles.workspaceFixed : ''}`}>
      <ContentErrorBoundary>
        <Outlet />
      </ContentErrorBoundary>
    </div>
    ```
  - Trong `bootstrap.tsx`: Bọc `<App />` bên trong `<ContentErrorBoundary>`.

- [ ] **Step 4: Commit**
  ```bash
  git add src/shared/ui/ src/app/bootstrap.tsx src/app/layout/AppShell.tsx src/test/shared/ui/
  git commit -m "feat(layout): wrap outlet with ContentErrorBoundary to prevent app white screen"
  ```

---

### Task 6: Lazy-load Dashboard & Bảo vệ Route `/portal/chat`

**Files:**

- Modify: `src/app/router/router.tsx:10, 350-357, 740`

**Interfaces:**

- Consumes: `PortalPageBoundary`, `lazy`
- Produces: Route `portal/chat` được bảo vệ bằng `PortalPageBoundary anyOf={['CHAT:READ', 'CHAT:WRITE']}`; Route `portal/dashboard` được lazy load.

- [ ] **Step 1: Bọc `PortalPageBoundary` cho `portal/chat` trong `router.tsx`**
  - Cập nhật định nghĩa route `portal/chat`:
    ```tsx
    {
      path: 'portal/chat',
      lazy: () =>
        Promise.all([
          import('@/features/portal/components/PortalPageBoundary'),
          import('@/features/portal/chat/pages/ChatWorkspacePage'),
        ]).then(([{ PortalPageBoundary }, { ChatWorkspacePage }]) => ({
          Component: () => (
            <PortalPageBoundary anyOf={['CHAT:READ', 'CHAT:WRITE']}>
              <ChatWorkspacePage />
            </PortalPageBoundary>
          ),
        })),
    }
    ```

- [ ] **Step 2: Lazy load `OperationsDashboardPage` và xóa static import**
  - Xóa dòng 10: `import { OperationsDashboardPage } from '@/features/foundation/OperationsDashboardPage'`.
  - Đổi dòng 740 thành:
    ```tsx
    {
      path: 'portal/dashboard',
      lazy: () =>
        import('@/features/foundation/OperationsDashboardPage').then(
          ({ OperationsDashboardPage }) => ({ Component: OperationsDashboardPage }),
        ),
    }
    ```

- [ ] **Step 3: Kiểm tra static checks toàn bộ dự án**
  - Chạy `npm run lint`
  - Chạy `npm run build`
  - Xác nhận build thành công và Recharts được tách thành chunk riêng biệt.

- [ ] **Step 4: Commit**
  ```bash
  git add src/app/router/router.tsx
  git commit -m "feat(router): secure chat route with PermissionBoundary and lazy-load dashboard"
  ```
