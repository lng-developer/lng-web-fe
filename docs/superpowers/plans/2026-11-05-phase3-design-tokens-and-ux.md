# Giai Đoạn 3: Chuẩn Hóa Design Tokens, Reactive Auth, Dark Mode & Tối Ưu UX Tương Tác (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện trải nghiệm vận hành người dùng và tối ưu sâu kiến trúc frontend: chuyển đổi State xác thực sang Reactive Auth Store phản ứng linh hoạt, tối ưu cơ chế retry QueryClient & tải động i18n theo ngôn ngữ, chuẩn hóa Design Tokens cho Dark Mode (triệt tiêu inline hex styles & dọn dẹp CSS override thô), xử lý triệt để Error States/Empty States trên các màn hình vận hành, và giải phóng API polling đơn hàng khỏi Layout Shell.

**Architecture:**

1. **Reactive Auth Store:** Xây dựng `useAuthStore` (Zustand) đồng bộ với `src/shared/auth/session.ts` để các hooks như `usePermissions()`, `useCurrentAccount()` tự động trigger re-render khi quyền hạn hoặc tài khoản thay đổi, loại bỏ triệt để tình trạng stale permission trong `useMemo(..., [])`.
2. **QueryClient & i18n Optimization:** Bỏ retry vô ích với mã lỗi HTTP 4xx (400, 401, 403, 404), bật `refetchOnReconnect: true`. Chuyển đổi từ điển i18n sang dynamic import (`import()`) theo ngôn ngữ người dùng lựa chọn để giảm initial chunk của i18n.
3. **Design Tokens & Dark Mode Parity:** Thay thế các mã màu hex hardcoded trong inline JSX styles (`AuditLogPage.tsx`, `HrDashboardPage.tsx`, `AccessEditor.tsx`) bằng các biến Ant Design CSS Tokens (`var(--ant-color-bg-container)`, `var(--ant-color-border)`, `var(--ant-color-text-secondary)`).
4. **Resilient Operational UI States:** Bổ sung prop `error` kèm `FeedbackAlert` retry cho các màn hình vận hành chính (`AttendancePage`, `FinanceWorkspacePage`, `InternalTemplateManagementPage`, `CustomerWorkspacePage`), ngăn chặn việc hiển thị nhầm "No data" khi mất mạng.
5. **Layout Shell Decoupling:** Tách `useOrderSummaryQuery` ra khỏi khối render tĩnh của `LegacySidebar`, chỉ fetch khi người dùng có quyền đơn hàng hoặc kích hoạt theo ngữ cảnh.

**Tech Stack:** React 19, Vite 8, Ant Design 6.x (Custom Tokens), SCSS Modules, Zustand 5, TanStack Query 5, Vitest.

---

### Task 1: Xây dựng Reactive Auth Store & Khắc phục Đóng băng Quyền (Permissions)

**Files:**

- Create: `src/shared/auth/useAuthStore.ts`
- Modify: `src/shared/auth/session.ts`
- Modify: `src/features/hr/pages/HrOverviewPage.tsx`
- Modify: `src/features/hr/pages/HrWorkspacePage.tsx`
- Modify: `src/features/hr/pages/PayrollPage.tsx`
- Modify: `src/features/audit/pages/AuditLogPage.tsx`
- Test: `src/test/auth/store/useAuthStore.test.ts`

**Steps:**

- [ ] **Step 1: Tạo `useAuthStore.ts` với Zustand**
  - Quản lý `accessToken`, `roles`, `permissions`, `globalPermissions`, `account`.
  - Cung cấp selector hooks: `usePermissions()`, `useRoles()`, `useCurrentAccount()`, `useIsAuthenticated()`.
  - Đồng bộ hai chiều với `src/shared/auth/session.ts` để các hàm đồng bộ (`getAccessToken()`, `getPermissions()`) của Axios Interceptor tiếp tục hoạt động trơn tru.
- [ ] **Step 2: Cập nhật `session.ts`**
  - Trong các hàm `setAccessToken`, `setPermissions`, `setRoles`, `setAccount`, dispatch cập nhật sang `useAuthStore.getState()`.
- [ ] **Step 3: Thay thế `useMemo(() => getPermissions(), [])` trong các trang HR và Audit**
  - Chuyển sang dùng `usePermissions()` từ `useAuthStore` để component re-render tức thì khi quyền được nạp.
- [ ] **Step 4: Viết Unit Test cho `useAuthStore`**
  - Kiểm tra `setPermissions`, `setAccessToken`, tính phản ứng của hooks khi state cập nhật.
- [ ] **Step 5: Chạy kiểm tra lint & tests**
  - `npm run lint` && `npm run test:unit`

---

### Task 2: Tối ưu QueryClient (Bỏ retry 4xx) & Dynamic Import từ điển i18n

**Files:**

- Modify: `src/shared/query/queryClient.ts`
- Modify: `src/shared/i18n/i18n.ts`
- Test: `src/test/shared/queryClient.test.ts`

**Steps:**

- [ ] **Step 1: Cập nhật cấu hình QueryClient**
  - Trong `src/shared/query/queryClient.ts`, thêm hàm điều kiện `retry`:
    ```typescript
    retry: (failureCount, error) => {
      // Không retry với lỗi client 4xx (400, 401, 403, 404, 422)
      if (error && typeof error === 'object' && 'response' in error) {
        const status = (error as { response?: { status?: number } }).response?.status
        if (status && status >= 400 && status < 500) return false
      }
      return failureCount < 2
    },
    refetchOnReconnect: true,
    ```
- [ ] **Step 2: Tối ưu nạp từ điển trong `i18n.ts`**
  - Nạp ngôn ngữ hiện tại (`vi` hoặc `en`), dynamic load gói ngôn ngữ còn lại khi người dùng thực hiện chuyển đổi qua `changeLanguage()`.
- [ ] **Step 3: Viết Unit Test và xác nhận**
  - Kiểm tra QueryClient không retry khi gặp lỗi 403 hoặc 404.
  - `npm run lint` && `npm run test:unit`

---

### Task 3: Chuẩn Hóa Design Tokens, Loại Bỏ Inline Hex Styles & Tinh Chỉnh SCSS

**Files:**

- Modify: `src/features/audit/pages/AuditLogPage.tsx`
- Modify: `src/features/audit/pages/AuditLogPage.module.scss`
- Modify: `src/features/auth/roles/components/AccessEditor.tsx`
- Modify: `src/features/hr/pages/HrDashboardPage.tsx`
- Modify: `src/styles/global.scss`
- Modify: `src/shared/theme/theme.ts`

**Steps:**

- [ ] **Step 1: Quét và thay thế 61 inline hex styles trong JSX**
  - Chuyển đổi các style cứng như `background: '#f8fafc'`, `border: '1px solid #e2e8f0'`, `color: '#64748b'` sang các token biến CSS Ant Design: `var(--ant-color-bg-container)`, `var(--ant-color-border-secondary)`, `var(--ant-color-text-secondary)`.
- [ ] **Step 2: Chuyển cấu hình `.ant-segmented` từ `global.scss` vào Theme Engine**
  - Cấu hình component tokens cho `Segmented` trong `src/shared/theme/theme.ts` (ví dụ `itemSelectedBg`, `itemHoverColor`), dọn dẹp các rule `!important` trong `global.scss`.
- [ ] **Step 3: Chạy lint & build kiểm tra**
  - `npm run lint` && `npm run build`

---

### Task 4: Phủ Error States & Empty States Cho Các Màn Hình Vận Hành

**Files:**

- Modify: `src/features/portal/catalog/pages/InternalTemplateManagementPage.tsx`
- Modify: `src/features/portal/finance/pages/FinanceWorkspacePage.tsx`
- Modify: `src/features/portal/customers/pages/CustomerWorkspacePage.tsx`
- Modify: `src/features/audit/pages/AuditLogPage.tsx`
- Modify: `src/features/portal/vendor/pages/VendorWorkspacePage.tsx`

**Steps:**

- [ ] **Step 1: Truyền prop `error` chuẩn cho `CoreDataTable`**
  - Kiểm tra `query.isError` và truyền `error={query.error}` kèm hành động retry `onRetry={() => query.refetch()}`.
- [ ] **Step 2: Đảm bảo phân biệt trạng thái Empty do Filter vs Không có dữ liệu**
  - Tận dụng `@/shared/ui/EmptyState` để hiển thị đúng thông điệp "Không tìm thấy dữ liệu khớp bộ lọc" khi có tìm kiếm, và "Chưa có bản ghi nào" khi dữ liệu rỗng.
- [ ] **Step 3: Chạy kiểm tra lint & unit tests**
  - `npm run lint` && `npm run test:unit`

---

### Task 5: Tách Order Summary Query Khỏi Layout Shell (`LegacySidebar`)

**Files:**

- Modify: `src/app/layout/LegacySidebar.tsx`
- Modify: `src/app/layout/SidebarOrderBadge.tsx` (hoặc tạo component con độc lập)
- Test: `src/test/app/layout/LegacySidebar.test.tsx`

**Steps:**

- [ ] **Step 1: Tạo component con `SidebarOrderBadge`**
  - Đóng gói hook `useOrderSummaryQuery` bên trong component con này thay vì gọi ở cấp toàn thể `LegacySidebar`.
  - Chỉ kích hoạt query khi tài khoản có quyền truy cập Orders (`ORDER:READ`).
- [ ] **Step 2: Cập nhật `LegacySidebar.tsx`**
  - Thay thế việc tính toán badge trực tiếp trong menu items bằng việc lồng `SidebarOrderBadge`.
- [ ] **Step 3: Chạy toàn bộ test suites**
  - `npm run lint` && `npm run test:unit` && `npm run build`
