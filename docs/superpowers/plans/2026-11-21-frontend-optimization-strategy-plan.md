# Kế Hoạch Triển Khai Toàn Diện Tối Ưu Hóa Frontend (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cao hiệu năng render, giảm thiểu DOM explosion, tối ưu tầng gọi API, và chuẩn hóa kiến trúc dữ liệu trên toàn bộ hệ thống `lng-web-fe` (đặc biệt tại các Workbench trọng điểm như Orders và Design Tasks).

**Architecture:**

- **Tầng API & Cache (Giai đoạn 1 & 3):** Khắc phục triệt để lỗi retry 4xx vô nghĩa trong TanStack Query, gom các boilerplate helper (`compactParams`, `unwrapResponse`), bổ sung `AbortSignal` đồng bộ, và chuyển từ cơ chế over-invalidation (refetch toàn bộ bảng) sang targeted / optimistic cache updates.
- **Tầng UI & DOM (Giai đoạn 2 & 4):** Áp dụng **Singleton Modal Pattern** (chuyển 7 modal gắn ở từng dòng lên cấp trang thông qua Zustand store), phân rã các "God Components" (như `PsdTasksPage.tsx` 1,367 dòng), và tối ưu lazy loading hình ảnh thumbnail.

**Tech Stack:** React 19, TypeScript, Vite 8, Ant Design v6, TanStack Query v5, Zustand v5, Axios, Vitest.

---

## Global Constraints

- **Công nghệ & Styling:** Bắt buộc tuân thủ Ant Design v6 + SCSS Modules + TanStack Query 5 theo [CONVENTIONS.md](file:///c:/Users/stack/Task/lng-web-fe/CONVENTIONS.md) và [DESIGN.md](file:///c:/Users/stack/Task/lng-web-fe/DESIGN.md). Không cài thêm thư viện UI bên ngoài.
- **Đa ngôn ngữ (i18n):** Toàn bộ copy UI mới hoặc thông báo phải dùng `useTranslation` và cập nhật đồng thời cả hai file `src/shared/i18n/locales/vi/common.json` và `en/common.json`.
- **Độ tin cậy & Kiểm thử:** Mỗi task đều phải có kiểm thử tương ứng (unit/ui test tại `src/test/`), đảm bảo pass `npm run lint` và `npm run build` trước khi tích hợp.
- **Git Flow:** Không commit trực tiếp vào `main` hay `develop`. Mọi thay đổi đi qua branch theo quy chuẩn Git dự án.

---

## Review Focus

1. **QueryClient Retry Check:** Đảm bảo `error instanceof ApiError` với HTTP 4xx (400, 401, 403, 404, 422) dừng ngay lập tức mà không retry thêm lần nào.
2. **DOM Node Count:** Khi mở rộng toàn bộ bảng đơn hàng 50 rows, số lượng Modal trong DOM tree phải giảm từ ~350 xuống đúng 7 Modals ở cấp Page.
3. **No Breaking User Flow:** Mọi hành vi thao tác (edit customer, address, shipping, timeline, case, replacement, image viewer) phải hoạt động chính xác 100% như cũ.
4. **Cache Reactivity:** Cập nhật CS Note hoặc trạng thái đơn hàng phải cập nhật tức thì trên UI qua cache mà không kích hoạt spinner reload toàn bảng.

---

# GIAI ĐOẠN 1: API Hygiene & Quick Wins (Sửa Lỗi Logic & Chuẩn Hóa API Layer)

### Task 1: Sửa bug Retry 4xx Error trong `queryClient.ts`

**Files:**

- Modify: `src/shared/query/queryClient.ts:10-20`
- Test: `src/test/shared/query/queryClient.test.ts` (Tạo mới hoặc bổ sung)

**Interfaces:**

- Consumes: `ApiError` từ `@/shared/api/apiError`, `axios`
- Produces: Hàm retry thông minh nhận diện đúng cả `ApiError` lẫn `AxiosError`

- [ ] **Step 1: Viết test kiểm tra retry logic cho `ApiError`**
  - Tạo test case mô phỏng:
    - Khi nhận `new ApiError('Not found', { status: 404 })` -> `retry` trả về `false`.
    - Khi nhận `new ApiError('Bad request', { status: 400 })` -> `retry` trả về `false`.
    - Khi nhận `new ApiError('Server error', { status: 500 })` và failureCount = 0 -> `retry` trả về `true`.
- [ ] **Step 2: Cập nhật cấu hình trong `queryClient.ts`**

  ```ts
  import { ApiError } from '@/shared/api/apiError'
  import axios from 'axios'

  retry: (failureCount, error) => {
    // 1. Kiểm tra ApiError đã chuẩn hóa từ apiClient interceptor
    if (error instanceof ApiError && typeof error.status === 'number') {
      if (error.status >= 400 && error.status < 500) {
        return false
      }
    }
    // 2. Fallback cho AxiosError thô nếu chưa qua interceptor
    if (axios.isAxiosError(error) && error.response?.status) {
      const status = error.response.status
      if (status >= 400 && status < 500) {
        return false
      }
    }
    return failureCount < 2
  }
  ```

- [ ] **Step 3: Chạy test xác nhận**
  ```bash
  npx vitest run src/test/shared/query
  ```
- [ ] **Step 4: Commit**
  ```bash
  git commit -m "fix(query): prevent invalid retries on client 4xx ApiError"
  ```

---

### Task 2: Chuẩn hóa API Helpers (`compactParams`, `unwrapResponse`) tại `@/shared/api`

**Files:**

- Create: `src/shared/api/helpers.ts`
- Modify: `src/shared/api/index.ts`
- Modify: `src/features/portal/orders/api/orderApi.ts`
- Modify: `src/features/portal/catalog/api/catalogApi.ts`
- Test: `src/test/shared/api/helpers.test.ts`

**Interfaces:**

- Produces: `compactParams<T>(params: T): Record<string, unknown>`, `unwrapResponse<T>(response: unknown): T`

- [ ] **Step 1: Tạo `src/shared/api/helpers.ts` và viết unit test**
  - Hàm `compactParams` loại bỏ các key có value rỗng `""`, `null`, `undefined`.
  - Hàm `unwrapResponse<T>` ép kiểu an toàn và bóc tách `response.data` của `ApiResponse<T>` hoặc trả về trực tiếp nếu đã unwrapped.
- [ ] **Step 2: Export qua `src/shared/api/index.ts`**
- [ ] **Step 3: Refactor `orderApi.ts` và `catalogApi.ts`**
  - Thay thế các khai báo hàm nội bộ `const compact = ...` và `const unwrap = ...` bằng import từ `@/shared/api`.
- [ ] **Step 4: Chạy lint và build kiểm tra type-safety**
  ```bash
  npm run typecheck
  npm run lint
  ```
- [ ] **Step 5: Commit**
  ```bash
  git commit -m "refactor(api): centralize compactParams and unwrapResponse helpers"
  ```

---

### Task 3: Bổ sung AbortSignal Propagation cho các Query Hooks Workbench

**Files:**

- Modify: `src/features/portal/orders/hooks/useOrderWorkbenchQuery.ts`
- Modify: `src/features/portal/orders/hooks/useOrderSummaryQuery.ts`
- Modify: `src/features/portal/catalog/hooks/` (các query liên quan)

**Interfaces:**

- Consumes: `signal` từ React Query context `({ signal }) => fetcher(params, signal)`

- [ ] **Step 1: Cập nhật `useOrderWorkbenchQuery.ts`**
  - Nhận `signal` từ React Query context và truyền vào `listOrderWorkbench(params, signal)`.
- [ ] **Step 2: Cập nhật `useOrderSummaryQuery.ts`**
  - Nhận `signal` và truyền vào `getOrderSummary(params, signal)`.
- [ ] **Step 3: Kiểm tra hành vi**
  - Đảm bảo khi gõ search nhanh hoặc chuyển tab, các request trước đó được browser tự động Abort mà không sinh ra lỗi unhandled rejection.
- [ ] **Step 4: Commit**
  ```bash
  git commit -m "perf(orders): propagate AbortSignal to order query hooks"
  ```

---

# GIAI ĐOẠN 2: Tái Cấu Trúc UI & Singleton Modal Pattern (Giải Quyết DOM Explosion)

### Task 4: Xây dựng `OrderActionModalsContainer` ở cấp Page

**Files:**

- Create: `src/features/portal/orders/components/OrderActionModalsContainer.tsx`
- Modify: `src/features/portal/orders/hooks/useOrderActionStore.ts`
- Modify: `src/features/portal/orders/pages/OrderWorkbenchPage.tsx`
- Test: `src/test/portal/orders/components/OrderActionModalsContainer.test.tsx`

**Interfaces:**

- Consumes: `useOrderActionStore`, `useOrderActionsMutation`, danh sách orders từ cache
- Produces: 1 container duy nhất chứa 7 modals (`OrderAddressModal`, `OrderCustomerModal`, `OrderShippingModal`, `OrderTimelineModal`, `OrderCaseModal`, `OrderReplacementModal`, `InteractiveImageViewerModal`).

- [ ] **Step 1: Mở rộng `useOrderActionStore.ts` nếu cần**
  - Lưu thêm `orderData` hoặc truy xuất `row` từ `orders.data.items` bằng `orderId` được chọn.
  - Hỗ trợ lưu trữ trạng thái của `interactiveImageViewer` tại store (URL, list ảnh, anchor).
- [ ] **Step 2: Hiện thực `OrderActionModalsContainer.tsx`**
  - Render duy nhất 1 instance cho từng modal:
    ```tsx
    export function OrderActionModalsContainer({ orderRow, ... }: Props) {
      // Chỉ mount nội dung khi có modal được mở
      if (!activeModal || !orderRow) return null;
      return (
        <>
          <OrderAddressModal open={activeModal === 'address'} ... />
          <OrderCustomerModal open={activeModal === 'customer'} ... />
          ...
        </>
      )
    }
    ```
- [ ] **Step 3: Tích hợp `OrderActionModalsContainer` vào `OrderWorkbenchPage.tsx`**
  - Đặt container ở cuối `OrderWorkbenchPage.tsx` bên ngoài bảng.
- [ ] **Step 4: Commit**
  ```bash
  git commit -m "feat(orders): create page-level OrderActionModalsContainer"
  ```

---

### Task 5: Dọn dẹp `OrderInlinePanel` và `OrderWorkbenchExpandedRow`

**Files:**

- Modify: `src/features/portal/orders/pages/OrderInlinePanel.tsx`
- Modify: `src/features/portal/orders/pages/OrderWorkbenchExpandedRow.tsx`
- Test: `src/test/portal/orders/pages/OrderInlinePanel.test.tsx`

**Interfaces:**

- Gỡ bỏ hoàn toàn việc import và render 7 Modals trong `OrderInlinePanel`.
- `OrderInlinePanel` chỉ còn nhiệm vụ duy nhất: Render danh sách `OrderItemPanel`.

- [ ] **Step 1: Cập nhật `OrderInlinePanel.tsx`**
  - Xóa bỏ các modal JSX ở cuối file.
  - Khi người dùng click hành động mở modal, trigger qua `useOrderActionStore.getState().openOrderModal(...)`.
- [ ] **Step 2: Cập nhật `OrderWorkbenchExpandedRow.tsx`**
  - Loại bỏ các props thừa liên quan đến modal forwarding (`requestedModal`, `requestedPopupAnchor`).
- [ ] **Step 3: Chạy test suite của Orders**
  ```bash
  npx vitest run src/test/portal/orders
  ```
- [ ] **Step 4: Đo đạc số lượng DOM nodes**
  - Đảm bảo DOM nodes giảm từ hàng chục nghìn xuống mức tiêu chuẩn, table cuộn mượt mà ở 60 FPS.
- [ ] **Step 5: Commit**
  ```bash
  git commit -m "perf(orders): remove row-level modal instantiation from OrderInlinePanel"
  ```

---

### Task 6: Phân rã "God Component" `PsdTasksPage.tsx` (1,367 dòng)

**Files:**

- Modify: `src/features/portal/design/pages/PsdTasksPage.tsx`
- Create: `src/features/portal/design/pages/psd-tasks/PsdTasksFilterBar.tsx`
- Create: `src/features/portal/design/pages/psd-tasks/PsdTasksColumns.tsx`
- Create: `src/features/portal/design/pages/psd-tasks/PsdTaskActionModals.tsx`
- Test: `src/test/portal/design/pages/PsdTasksPage.test.tsx`

**Interfaces:**

- Tách trang nguyên khối thành 3 thành phần độc lập: FilterBar, TableColumns definition, và ActionModals.

- [ ] **Step 1: Tạo `PsdTasksFilterBar.tsx`**
  - Đóng gói các select shop, priority, assignees, dates, search input.
- [ ] **Step 2: Tạo `PsdTasksColumns.tsx`**
  - Chuyển `renderHistoryContent`, `getStatusInfo`, `getPriorityInfo` và cấu hình columns sang file riêng.
- [ ] **Step 3: Tạo `PsdTaskActionModals.tsx`**
  - Đóng gói modal Upload PSD, Confirm Reject, Reopen, Edit Task.
- [ ] **Step 4: Tái cấu trúc `PsdTasksPage.tsx`**
  - Rút ngắn file chính từ 1,367 dòng xuống < 250 dòng, đóng vai trò orchestrator điều phối state.
- [ ] **Step 5: Chạy lint và test**
  ```bash
  npx vitest run src/test/portal/design
  npm run lint
  ```
- [ ] **Step 6: Commit**
  ```bash
  git commit -m "refactor(design): decompose monolithic PsdTasksPage into submodules"
  ```

---

# GIAI ĐOẠN 3: Tối Ưu Cache State & Network Strategy (UX Speedup)

### Task 7: Chuyển từ Over-invalidation sang Targeted Cache Updates trong `useOrderActionsMutation`

**Files:**

- Modify: `src/features/portal/orders/hooks/useOrderActionsMutation.ts`
- Test: `src/test/portal/orders/hooks/useOrderActionsMutation.test.ts`

**Interfaces:**

- Consumes: `queryClient.setQueryData`, `queryClient.setQueriesData`

- [ ] **Step 1: Phân loại các Action không cần refetch toàn bảng**
  - Action `note` (sửa CS Note): Cập nhật trực tiếp `csNote` của item trong cache query `orderKeys.workbench(...)` mà không gọi `invalidateQueries`.
  - Action `address` (sửa địa chỉ) / `customer` (sửa thông tin buyer): Cập nhật trực tiếp `order.shippingAddress` / `order.buyer` trong cache.
- [ ] **Step 2: Áp dụng Optimistic Update cho các thao tác nhanh**
  - Khi operator lưu ghi chú, UI cập nhật lập tức, nếu API lỗi thì rollback.
- [ ] **Step 3: Chỉ invalidate đúng scope bị ảnh hưởng**
  - Các thao tác lớn (như cancel item, replacement) mới cần invalidate toàn bộ danh sách.
- [ ] **Step 4: Chạy test kiểm chứng**
  ```bash
  npx vitest run src/test/portal/orders
  ```
- [ ] **Step 5: Commit**
  ```bash
  git commit -m "perf(orders): implement targeted and optimistic cache updates for order actions"
  ```

---

### Task 8: Triển khai Prefetching thông minh

**Files:**

- Modify: `src/features/portal/orders/pages/OrderWorkbenchPage.tsx`
- Modify: `src/app/common/TablePagination.tsx`

**Interfaces:**

- Consumes: `queryClient.prefetchQuery`

- [ ] **Step 1: Prefetch trang tiếp theo (`page + 1`)**
  - Khi bảng orders tải xong trang `page`, kích hoạt prefetch cho trang `page + 1` với cùng query params nếu `page * pageSize < total`.
- [ ] **Step 2: Prefetch khi hover Tab**
  - Khi operator rê chuột lên tab (ví dụ: `PAYMENT_PENDING` hoặc `IN_PROGRESS`), kích hoạt `prefetchQuery` cho tab đó.
- [ ] **Step 3: Kiểm tra Network Tab**
  - Chuyển trang/tab phản hồi tức thì với 0ms loading spinner.
- [ ] **Step 4: Commit**
  ```bash
  git commit -m "perf(orders): add intelligent pagination and tab prefetching"
  ```

---

# GIAI ĐOẠN 4: Asset & Bundle Optimization

### Task 9: Tối ưu hiển thị ảnh Preview / Thumbnail trong bảng

**Files:**

- Modify: `src/shared/ui/ZoomableImage.tsx`
- Modify: `src/features/portal/orders/components/OrderItemPanel.tsx`
- Modify: `src/features/portal/catalog/pages/CatalogListingWorkbenchPage.tsx`

- [ ] **Step 1: Chuẩn hóa `loading="lazy"` và kích thước hiển thị**
  - Đảm bảo tất cả thumbnail trong bảng đều có thuộc tính `loading="lazy"` và `decoding="async"`.
  - Sử dụng URL thumbnail thu nhỏ thay vì tải file ảnh gốc dung lượng lớn từ media server.
- [ ] **Step 2: Error fallback và Skeleton Placeholder**
  - Thêm ảnh fallback nhẹ khi đường dẫn media lỗi hoặc đang tải, tránh layout shift (CLS).
- [ ] **Step 3: Commit**
  ```bash
  git commit -m "perf(ui): optimize media thumbnail lazy loading and error states"
  ```

---

### Task 10: Rà soát Bundle Chunk Budget

**Files:**

- Modify: `vite.config.ts` (nếu cần tinh chỉnh `manualChunks`)
- Test/Run: `npm run performance:bundle`

- [ ] **Step 1: Chạy bundle report hiện tại**
  ```bash
  npm run build:prod
  npm run performance:bundle
  ```
- [ ] **Step 2: Phân tích các chunk lớn nhất**
  - Kiểm tra xem Ant Design icons hoặc Recharts có bị lọt vào chunk chính không.
  - Đảm bảo `budgetPassed: true` theo tiêu chuẩn `LIMITS` (entryGzipKb <= 400KB, totalGzipKb <= 1350KB).
- [ ] **Step 3: Commit kết quả tối ưu**
  ```bash
  git commit -m "build: verify and optimize bundle chunk budgets"
  ```

---

## Lộ Trình Thực Hiện Tóm Tắt (Execution Roadmap)

| Giai đoạn       | Nội dung trọng tâm                                 | Thời lượng ước tính | Kết quả đầu ra                                           |
| :-------------- | :------------------------------------------------- | :------------------ | :------------------------------------------------------- |
| **Giai đoạn 1** | Sửa bug Retry 4xx, gom API helpers, AbortSignal    | 1 - 2 ngày          | Chấm dứt request rác lên BE, không còn race condition    |
| **Giai đoạn 2** | Singleton Modal cho Orders, phân rã `PsdTasksPage` | 2 - 4 ngày          | Giảm 95% số lượng modal trong DOM, cuộn bảng 60 FPS      |
| **Giai đoạn 3** | Targeted / Optimistic updates, Prefetching         | 2 - 3 ngày          | Thao tác 0ms delay, không giật chớp bảng khi lưu dữ liệu |
| **Giai đoạn 4** | Lazy load thumbnail, kiểm soát Bundle Budget       | 1 - 2 ngày          | Tải trang đầu cực nhanh, tối ưu băng thông               |
