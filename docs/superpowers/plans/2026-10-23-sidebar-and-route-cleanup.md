# Kế Hoạch Chuẩn Hóa Routes & Tối Ưu Hóa Sidebar (LNG Enterprise POD)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dọn dẹp triệt để các routes trùng lặp, xóa code mồ côi thừa của phân hệ Design, chuẩn hóa liên kết Work Scores cho Fulfillment và mở đầy đủ các trang Finance trên Sidebar hiện tại.

**Architecture:** Giữ nguyên thiết kế thanh Sidebar 2 cột (Dual-Rail) hiện tại, cập nhật routing trong `router.tsx` theo chuẩn Canonical URL + HTTP 301/302 Redirect (`<Navigate replace />`), cập nhật danh mục menu trong `LegacySidebar.tsx` và `appNavigation.ts`.

**Tech Stack:** React 18, React Router v6, TypeScript, Ant Design, i18next.

---

## Danh Sách File Tác Động

- `src/app/router/router.tsx`: Chuẩn hóa canonical routes và redirects.
- `src/app/layout/LegacySidebar.tsx`: Cập nhật menu Fulfillment (Production Scores) và Finance (Overview, Settlements, Cash Flow, Ledger).
- `src/app/layout/appNavigation.ts`: Cập nhật đường dẫn chuẩn cho Audit, Monitoring và Design.
- `src/features/notifications/notificationTarget.ts`: Cập nhật đường dẫn notification cho design task.
- `src/shared/i18n/locales/vi/common.json` & `en/common.json`: Thêm nhãn i18n cho Production Scores và các mục Finance.
- Xóa / Tinh gọn:
  - `src/features/portal/design/pages/DesignWorkspacePage.tsx` + `.module.scss` (612 dòng mồ côi).
  - `src/test/portal/design/pages/DesignWorkspacePage.test.tsx`.
  - Thay thế `DesignWorkbenchPage` bằng redirect chuẩn về `IdeaTasksPage`.

---

## Chi Tiết Các Tác Vụ Triển Khai

### Task 1: Dọn dẹp Nhóm 1 & 6 (Trùng lặp 100% & Legacy Redirects)

- [x] **Step 1: Chuẩn hóa Audit Log**
  - Giữ canonical URL: `/portal/audit` $\rightarrow$ `AuditLogPage`.
  - Đổi `/auth/audit-log` trong `router.tsx` thành `<Navigate to="/portal/audit" replace />`.
  - Cập nhật `appNavigation.ts` trỏ vào `/portal/audit`.
- [x] **Step 2: Chuẩn hóa Monitoring Dashboard**
  - Giữ canonical URL: `/portal/monitoring` $\rightarrow$ `MonitoringDashboardPage`.
  - Đổi `/auth/monitoring` trong `router.tsx` thành `<Navigate to="/portal/monitoring" replace />`.
  - Cập nhật `appNavigation.ts` trỏ vào `/portal/monitoring`.
- [x] **Step 3: Chuẩn hóa Account Access Editor**
  - Giữ canonical URL: `/auth/accounts/:accountId/access` $\rightarrow$ `AccessEditorPage`.
  - Đổi `/auth/access/:accountId` thành `<Navigate to="/auth/accounts/:accountId/access" replace />`.
- [x] **Step 4: Kiểm tra và kiểm chứng TypeScript compilation**
  - Chạy `npx tsc -b` để xác nhận không có lỗi cú pháp hoặc gãy import.

---

### Task 2: Quy hoạch lại Nhóm 2 (Design)

- [x] **Step 1: Xóa route và code mồ côi `DesignWorkspacePage`**
  - Xóa file `src/features/portal/design/pages/DesignWorkspacePage.tsx` và `DesignWorkspacePage.module.scss`.
  - Xóa test `src/test/portal/design/pages/DesignWorkspacePage.test.tsx`.
  - Xóa route `portal/design/workspace` trong `router.tsx` (thay bằng redirect về `/portal/design/idea-tasks`).
- [x] **Step 2: Thống nhất `/portal/design` về trang nhiệm vụ chuyên biệt**
  - Cập nhật `router.tsx`:
    - `portal/design` $\rightarrow$ `<Navigate to="/portal/design/idea-tasks" replace />` (hoặc render wrapper chuyển hướng thông minh).
    - `portal/design/:salesChannel` $\rightarrow$ chuyển hướng sang `/portal/design/idea-tasks?salesChannelCode=:salesChannel`.
  - Cập nhật `notificationTarget.ts`: trỏ `designTask` sang `/portal/design/idea-tasks`.
  - Cập nhật `appNavigation.ts`: trỏ menu design sang `/portal/design/idea-tasks`.
  - Dọn dẹp / tinh gọn `DesignWorkbenchPage.tsx` và `CreateDesignTaskModal.tsx`.
- [x] **Step 3: Kiểm chứng TypeScript & ESLint**
  - Chạy `npx tsc -b` và `npm run lint`.

---

### Task 3: Sắp xếp lại Nhóm 3 (Work Scores) & Nhóm 5 (Finance)

- [x] **Step 1: Cập nhật menu Fulfillment trong `LegacySidebar.tsx`**
  - Sửa `detailMenus.fulfillment`: thay `/portal/work-scores` bằng `/portal/production/scores`.
  - Cập nhật nhãn i18n cho Production Scores: `legacyMenu.productionScores` = `"Điểm sản lượng SX"`.
  - Cập nhật logic `canAccessItemDirectly` cho `/portal/production/scores`.
- [x] **Step 2: Mở rộng menu Finance trong `LegacySidebar.tsx`**
  - Mở rộng `financeMenuItem` hiển thị đầy đủ 4 tính năng:
    1. `/portal/finance`: Tổng quan tài chính đơn hàng (Finance Overview).
    2. `/portal/finance/settlements`: Đối soát Settlement.
    3. `/portal/finance/cash-flow`: Dòng tiền (Cash Flow).
    4. `/portal/finance/transactions`: Sổ cái giao dịch (Transaction Ledger).
  - Cập nhật i18n trong `en/common.json` và `vi/common.json`.
  - Cập nhật `canAccessItemDirectly` để cấp quyền truy cập các đường dẫn `/portal/finance/*`.
- [x] **Step 3: Kiểm chứng toàn diện**
  - Chạy `npx tsc -b` (0 errors).
  - Chạy `npm run lint` (0 errors).
  - Kiểm tra `git status` và `git diff` để đảm bảo sạch sẽ và không tác động ngoài phạm vi.
