# Giai Đoạn 2: Tối Ưu Build, Hiệu Năng & Tái Cấu Trúc Module (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tối ưu hóa toàn diện hiệu năng đóng gói (Bundle Optimization) trong Vite, gỡ bỏ coupling sai quy chuẩn giữa các feature modules (`organization -> hr`, `foundation -> orders`), dọn dẹp các thư viện thừa rác (`zod`, `react-icons`), tăng tốc vòng lặp kiểm thử Vitest trên Linux/WSL2 và đồng bộ hóa tài liệu kỹ thuật (`CONVENTIONS.md`, `AGENTS.md`) khớp 100% với hiện trạng Ant Design v6.

**Architecture:**

1. Cấu hình phân tách vendor chunks (`manualChunks`) và kích hoạt `cssMinify: 'esbuild'` trong Vite để giảm 247 assets rời rạc và ép dung lượng bundle gzip từ 1319.7 KB xuống dưới 900 KB (an toàn dưới trần 1350 KB).
2. Chuẩn hóa Type contracts dùng chung (`Page<T>`, `CurrentAccount`) chuyển về `@/server/type.ts` và `@/shared/auth/types.ts`.
3. Tách presentation formatters (`orderPresentation`) thành shared utilities để bảo toàn tính độc lập của các feature.
4. Gỡ bỏ các package thừa (`zod`, `@tanstack/react-query-devtools`) và thay thế 25 icon `react-icons` bằng `@ant-design/icons`.

**Tech Stack:** React 19, Vite 8, Rollup, Ant Design 6.x, SCSS Modules, Vitest.

**Spec:** [master-frontend-audit-report.md](file:///home/adminhieungo/.gemini/antigravity/brain/a438c683-706d-4778-ab40-6dbf4b7a4af1/master-frontend-audit-report.md)

## Global Constraints

- Không thêm bất kỳ frontend dependency mới nào.
- 100% UI dùng Ant Design v6 + SCSS Modules. Không import MUI hay Tailwind.
- Sau mỗi task, bắt buộc chạy kiểm tra: `npm run lint` và `npm run build`.

## Review Focus

- ManualChunks Splitting: Đảm bảo không tạo circular chunk dependency giữa `vendor-react` và `vendor-antd`.
- Type Refactoring: Đảm bảo khi chuyển `Page<T>` sang `@/server/type.ts`, toàn bộ các file trong `hr` và `organization` biên dịch không lỗi types.
- Icon Migration: Khi thay `react-icons` bằng `@ant-design/icons`, đảm bảo giao diện Sidebar không bị lệch vị trí, vỡ layout hay mất icon.

---

### Task 1: Tối ưu cấu hình đóng gói Vite (cssMinify & manualChunks)

**Files:**

- Modify: `vite.config.ts:48-56`
- Verify: `scripts/performance/bundle-report.mjs` (hoặc chạy `npm run build`)

**Interfaces:**

- Consumes: Vite `defineConfig`, Rollup `output.manualChunks`
- Produces: 5 vendor chunks ổn định (`vendor-react`, `vendor-antd`, `vendor-tanstack`, `vendor-charts`, `vendor-utils`, `vendor-msal`), CSS minified.

- [ ] **Step 1: Cập nhật `vite.config.ts`**
  - Đổi `cssMinify: false` thành `cssMinify: 'esbuild'`.
  - Bổ sung hàm `manualChunks` vào `rollupOptions.output`:
    ```typescript
    output: {
      manualChunks(id) {
        if (id.includes('node_modules')) {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react'
          }
          if (id.includes('antd') || id.includes('@ant-design')) {
            return 'vendor-antd'
          }
          if (id.includes('@tanstack')) {
            return 'vendor-tanstack'
          }
          if (id.includes('recharts')) {
            return 'vendor-charts'
          }
          if (id.includes('axios') || id.includes('dayjs') || id.includes('i18next')) {
            return 'vendor-utils'
          }
          if (id.includes('@azure/msal-browser')) {
            return 'vendor-msal'
          }
        }
      },
    },
    ```

- [ ] **Step 2: Chạy kiểm tra build và đo lường bundle size**
      Run: `npm run build`
      Expected: Build thành công, số lượng assets giảm đáng kể, kích thước bundle gzip giảm rõ rệt.

- [ ] **Step 3: Commit**
  ```bash
  git add vite.config.ts
  git commit -m "perf(build): enable cssMinify and optimize manualChunks vendor splitting"
  ```

---

### Task 2: Gỡ bỏ Coupling giữa `organization`, `hr` và `foundation`

**Files:**

- Modify: `src/features/organization/api/organizationApi.ts:1`
- Modify: `src/features/hr/api/hrOperationsApi.ts:4-7`
- Modify: `src/features/foundation/OperationsDashboardLists.tsx:15-18`
- Modify: `src/features/portal/orders/index.ts` (hoặc tạo file re-export status formatters sạch sẽ)

**Interfaces:**

- Consumes: `@/server/type` (export `Page<T>`, `ApiResponse<T>`)
- Produces: `Page<T>` dùng chung từ `@/server/type`, gỡ bỏ hoàn toàn việc `organization` import từ `hr`.

- [ ] **Step 1: Chuẩn hóa import `Page<T>` trong `organizationApi.ts` và `hrOperationsApi.ts`**
  - Trong `organizationApi.ts:1`: Đổi thành:
    ```typescript
    import { ApiResponse, Page } from '@/server/type'
    ```
    Xóa dòng import từ `@/features/hr/api/hrOperationsApi`.
  - Trong `hrOperationsApi.ts`: Xóa khai báo `export type Page<T>` trùng lặp, import `Page` từ `@/server/type`.

- [ ] **Step 2: Module hóa status formatters cho `foundation`**
  - Đảm bảo `formatOrderStatusLabel` và `orderStatusTone` được export qua public API của feature `orders` (`@/features/portal/orders`) thay vì `foundation` chọc sâu vào đường dẫn file nội bộ `pages/orderPresentation`.

- [ ] **Step 3: Kiểm tra compile TypeScript**
      Run: `npx tsc -p tsconfig.app.json --noEmit`
      Expected: 0 type errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/features/organization/api/organizationApi.ts src/features/hr/api/hrOperationsApi.ts src/features/foundation/ src/features/portal/orders/
  git commit -m "refactor(architecture): decouple organization from hr and modularize order formatters"
  ```

---

### Task 3: Dọn dẹp Dependencies thừa (`zod`, `react-icons`, `@tanstack/react-query-devtools`)

**Files:**

- Modify: `src/app/layout/LegacySidebar.tsx` (thay thế icons `react-icons` sang `@ant-design/icons`)
- Modify: `src/app/layout/navigationSearchItems.tsx` (thay thế icons sang `@ant-design/icons`)
- Modify: `package.json`

**Interfaces:**

- Consumes: `@ant-design/icons`
- Produces: Loại bỏ hoàn toàn `react-icons`, `zod`, `@tanstack/react-query-devtools` khỏi `package.json`.

- [ ] **Step 1: Thay thế các icon trong `LegacySidebar.tsx` và `navigationSearchItems.tsx`**
  - Thay `FaAmazon`, `FaEtsy`, `FaShopify` bằng `ShopOutlined` hoặc SVG/AntD icons phù hợp.
  - Thay `AiOutlineFileSync` bằng `SyncOutlined`.
  - Thay `BsFiletypePsd` bằng `FileImageOutlined`.
  - Thay `CgShoppingBag`, `HiOutlineBuildingStorefront` bằng `ShoppingOutlined`, `AppstoreOutlined`.
  - Thay `FaAnglesLeft`, `FaAnglesRight` bằng `DoubleLeftOutlined`, `DoubleRightOutlined`.
  - Thay `IoImageOutline` bằng `PictureOutlined`.

- [ ] **Step 2: Gỡ bỏ dependencies khỏi `package.json`**
  - Gỡ `react-icons`, `zod`, `@tanstack/react-query-devtools`:
    `npm uninstall react-icons zod @tanstack/react-query-devtools`

- [ ] **Step 3: Kiểm tra build & lint**
      Run: `npm run lint && npm run build`
      Expected: PASS, dung lượng `node_modules` và bundle sạch sẽ.

- [ ] **Step 4: Commit**
  ```bash
  git add package.json package-lock.json src/app/layout/
  git commit -m "chore(deps): remove unused zod and devtools, replace react-icons with antd icons"
  ```

---

### Task 4: Tăng tốc Vitest runner trên Linux/WSL2

**Files:**

- Modify: `package.json:21`

**Interfaces:**

- Consumes: Vitest CLI flags
- Produces: Giới hạn 2 worker threads cho unit tests, loại bỏ hiện tượng nghẽn disk I/O (`Dl+` sleep state) trên `/mnt/c/`.

- [ ] **Step 1: Cập nhật script `test:unit` trong `package.json`**
      Đổi từ:

  ```json
  "test:unit": "vitest run --project unit"
  ```

  thành:

  ```json
  "test:unit": "vitest run --project unit --maxWorkers=2"
  ```

- [ ] **Step 2: Chạy thử nghiệm và đo thời gian**
      Run: `npm run test:unit`
      Expected: Toàn bộ 82 unit test files chạy xong nhanh chóng (dưới 15 giây thay vì 137 giây).

- [ ] **Step 3: Commit**
  ```bash
  git add package.json
  git commit -m "perf(test): limit test:unit to 2 workers to prevent WSL2 disk I/O bottleneck"
  ```

---

### Task 5: Đồng bộ hóa tài liệu kỹ thuật (`CONVENTIONS.md` & `AGENTS.md`)

**Files:**

- Modify: `AGENTS.md:20`
- Modify: `CONVENTIONS.md:7-25, 70-85`

**Interfaces:**

- Consumes: Hiện trạng thực tế của codebase
- Produces: Tài liệu conventions chuẩn xác 100% với Ant Design v6 + SCSS Modules, chặn đứng việc AI hoặc Dev mới viết code MUI/Tailwind.

- [ ] **Step 1: Cập nhật `AGENTS.md`**
      Sửa dòng 20 thành:
      `- Prefer existing Ant Design v6 components, SCSS Modules, shared UI primitives (@/shared/ui), TanStack Query, and Zustand before adding anything new.`

- [ ] **Step 2: Cập nhật bảng Tech Stack trong `CONVENTIONS.md`**
  - Thay MUI 9 và Tailwind CSS 4 bằng: **Ant Design 6 (Custom Token Engine) + SCSS Modules**.
  - Thay `react-hook-form + zod` bằng: **Ant Design Form (Form.Item rules & typed interfaces)**.
  - Thay `notistack` bằng: **useFeedbackToast (@/shared/ui) + Ant Design App (message/notification)**.
  - Cập nhật sơ đồ thư mục khớp với hiện trạng (`src/shared/ui`, `src/features/`, không còn `src/validations`).

- [ ] **Step 3: Commit**
  ```bash
  git add AGENTS.md CONVENTIONS.md
  git commit -m "docs(conventions): synchronize tech stack documentation with Ant Design v6 reality"
  ```
