---
version: '1.0'
name: 'lng-web-fe-design-system'
archetype: 'Enterprise Operations & POD FBM Workbench'
framework: 'Ant Design v6 (Custom Token Engine) + SCSS Modules'
target: 'LNG Web POD FBM Operations Platform'

colors:
  primary: '#2563eb'
  primary-hover: '#1d4ed8'
  info: '#0284c7'
  success: '#10B981'
  warning: '#F59E0B'
  error: '#EF4444'

  # Light Mode Surfaces & Text
  light:
    canvas: '#F8FAFC'
    container: '#FFFFFF'
    elevated: '#FFFFFF'
    border: '#CBD5E1'
    border-subtle: '#E2E8F0'
    text-primary: '#0F172A'
    text-secondary: '#475569'
    text-tertiary: '#94A3B8'
    table-header-bg: '#FAFBFC'
    table-row-hover: '#F8FAFC'

  # Dark Mode Surfaces & Text
  dark:
    canvas: '#18191A'
    container: '#242526'
    elevated: '#242526'
    border: '#393A3B'
    border-subtle: '#2F3031'
    text-primary: '#E4E6EB'
    text-secondary: '#B0B3B8'
    text-tertiary: '#8A8D91'
    table-header-bg: '#242526'
    table-row-hover: '#2A2B2C'

typography:
  font-family: "'Plus Jakarta Sans', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  page-title:
    fontSize: '20px'
    fontWeight: 600
    lineHeight: '28px'
  section-title:
    fontSize: '16px'
    fontWeight: 600
    lineHeight: '24px'
  body-default:
    fontSize: '14px'
    fontWeight: 400
    lineHeight: '20px'
  table-cell:
    fontSize: '13px'
    fontWeight: 400
    lineHeight: '18px'
  form-label:
    fontSize: '13px'
    fontWeight: 500
    lineHeight: '18px'
  badge-micro:
    fontSize: '12px'
    fontWeight: 500
    lineHeight: '18px'

dimensions:
  control-height: 36px # Chuẩn chiều cao cho Button, Input, Select, DatePicker
  border-radius-base: 8px # Cards, Modals, Inputs, Buttons
  border-radius-sm: 6px # Tags, Segmented items
  border-radius-lg: 12px # Large cards, Floating drawers
  table-cell-padding-y: 10px
  table-cell-padding-x: 12px
  drawer-padding: 20px
---

# LNG Web FE — Design System & UI Specification

Tài liệu này định nghĩa ngôn ngữ thiết kế, nguyên tắc giao diện và bộ quy chuẩn linh kiện cho **LNG Web POD FBM**.
Tất cả các AI Coding Agent và kỹ sư phát triển bắt buộc phải tuân thủ tài liệu này khi sinh mã, tạo mới hoặc tinh chỉnh giao diện người dùng (UI).

---

## 1. Triết lý thiết kế (Design Philosophy)

- **Operational & High-Density First**: Đây là hệ thống vận hành POD (Print on Demand) và FBM (Fulfillment by Merchant). Màn hình phải tối ưu diện tích cho bảng dữ liệu, bộ lọc nhiều điều kiện, queue xử lý và ngăn thao tác (drawer/modal). Tránh các khoảng trắng dư thừa kiểu marketing (hero section, padding quá lớn).
- **Context Preservation (Giữ ngữ cảnh vận hành)**: Ưu tiên mở xem chi tiết đơn hàng / thiết kế / sản phẩm bằng `DetailDrawer` hoặc `PopupModal` ngay trên trang hiện tại, tránh chuyển hướng trang làm mất bộ lọc và vị trí cuộn của người dùng.
- **Dual Theme Parity**: Toàn bộ UI phải hỗ trợ chuẩn xác cả hai chế độ **Light** và **Dark** thông qua hệ thống token của Ant Design (`src/shared/theme/theme.ts`) và CSS variables (`src/styles/global.scss`). Tuyệt đối không hardcode màu hex trực tiếp trong JSX/SCSS nếu không qua token.

---

## 2. Bảng mã màu & Trạng thái (Colors & Status Tokens)

### 2.1. Màu chủ đạo & Hệ thống (Brand & System Colors)

- **Primary**: `#2563eb` (Blue-600) — Nút chính, tab được chọn, liên kết hành động.
- **Success**: `#10B981` (Emerald) / `#39a00d` — Hoàn thành, đã duyệt, sync thành công.
- **Warning**: `#F59E0B` (Amber) / `#d46a08` — Chờ xử lý, cảnh báo tồn kho, cần kiểm tra lại.
- **Error / Danger**: `#EF4444` (Red) / `#cd1323` — Lỗi in, hủy đơn, QC thất bại, hành động nguy hiểm.
- **Info**: `#0284c7` (Sky-600) — Thông tin hệ thống, ghi chú vận hành.

### 2.2. Trạng thái nghiệp vụ (Operational Status Pills)

Khi hiển thị trạng thái đơn hàng, trạng thái QC, hoặc mapping sản phẩm, luôn sử dụng component `StatusPill` từ `@/shared/ui`:

- **Công thức phối màu**: Viền 1px mã màu trạng thái + Nền tinted (`${color}15` ~8% opacity) + Chữ cùng màu.
- **Các mã màu trạng thái chuẩn (`DATA_COLORS`)**:
  - `pending`: `#0958d7` (Chờ xử lý / Đang chờ duyệt)
  - `process`: `#d46a08` (Đang sản xuất / Đang xử lý)
  - `success`: `#39a00d` (Đã giao hàng / Hoàn tất / QC Passed)
  - `cancelled`: `#cd1323` (Đã hủy đơn / QC Rejected)
  - `purple`: `#7248BA` (Đơn ưu tiên / Trạng thái đặc biệt)
  - `default`: `#94a3b8` (Chưa kích hoạt / Lưu nháp)

---

## 3. Quy chuẩn kích thước & Khoảng cách (Spacing & Dimensions)

- **Chiều cao điều khiển (Control Height)**:
  - Mặc định: **`36px`** cho mọi `Button`, `Input`, `Select`, `DatePicker`.
  - Compact / Small: **`28px`** (cho inline action buttons trong bảng).
- **Bo góc (Border Radius)**:
  - Form controls, Button, Card, Modal: **`8px`**
  - Tag, Badge nhỏ: **`6px`**
  - StatusPill: **`9999px`** (Full pill)
- **Thang khoảng cách (Spacing Scale)**:
  - Micro (giữa icon và text): `4px - 6px`
  - Compact (khoảng cách giữa các nút cạnh nhau, filter items): `8px` (`gap-2`)
  - Default (khoảng cách giữa các khối controls): `12px - 16px` (`gap-3` - `gap-4`)
  - Container padding (padding trong card, table wrapper): `16px - 20px`

---

## 4. Thư viện Linh kiện Dùng chung (Shared Component Catalog)

Tất cả các màn hình mới **bắt buộc** phải tái sử dụng các linh kiện chuẩn sau từ `@/app/common` và `@/shared/ui`:

| Linh kiện                | Đường dẫn import                 | Mục đích sử dụng                                                                                                     |
| :----------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **`CoreDataTable`**      | `@/app/common/CoreDataTable`     | Bảng dữ liệu vận hành. Tích hợp sẵn server-side sorting, phân trang cố định, `fillViewport` tự kéo dài kín màn hình. |
| **`CoreButton`**         | `@/app/common/CoreButton`        | Nút bấm thao tác chuẩn hóa (hỗ trợ loading, icon, danger mode).                                                      |
| **`FilterBar`**          | `@/shared/ui/FilterBar`          | Thanh công cụ lọc phía trên danh sách. Chứa `SearchInput`, `DateRangePicker`, `Select`.                              |
| **`DetailDrawer`**       | `@/shared/ui/DetailDrawer`       | Drawer trượt từ bên phải vào để xem chi tiết bản ghi (đơn, ảnh thiết kế, log).                                       |
| **`PopupModal`**         | `@/shared/ui/PopupModal`         | Modal pop-up có anchor cố định hoặc form thao tác nhanh.                                                             |
| **`ConfirmDangerModal`** | `@/shared/ui/ConfirmDangerModal` | Modal xác nhận hành động nguy hiểm (Xóa, Hủy đơn, Re-assign).                                                        |
| **`BulkActionBar`**      | `@/shared/ui/BulkActionBar`      | Thanh tác vụ nổi khi người dùng tích chọn nhiều dòng trong bảng.                                                     |
| **`PageHeader`**         | `@/shared/ui/PageHeader`         | Header đầu trang (Tiêu đề, breadcrumb, và nhóm action buttons chính bên phải).                                       |
| **`MetricCard`**         | `@/shared/ui/MetricCard`         | Thẻ thống kê chỉ số KPI (kèm tỷ lệ % tăng/giảm và icon).                                                             |
| **`EmptyState`**         | `@/shared/ui/EmptyState`         | Hiển thị khi danh sách trống hoặc bộ lọc không có kết quả.                                                           |
| **`LoadingState`**       | `@/shared/ui/LoadingState`       | Hiển thị skeleton / spinner khi đang tải dữ liệu.                                                                    |
| **`StatusPill`**         | `@/shared/ui/StatusPill`         | Huy hiệu trạng thái tròn (Status pill) có màu sắc chuẩn hóa.                                                         |

---

## 5. Quy tắc phát triển UI cho AI Agents (Do's & Don'ts)

### DO (Nên làm):

1. **Dùng Ant Design Tokens**: Khi viết style tùy biến, ưu tiên dùng `var(--ant-color-border)`, `var(--ant-color-primary)`, hoặc các biến trong `src/styles/global.scss` (`--ui-border-soft`, `--ui-surface-elevate-shadow`).
2. **Quản lý trạng thái trống (Empty & Error)**: Luôn bọc bảng bằng `emptyText` và `error` của `CoreDataTable`.
3. **Đa ngôn ngữ (i18n)**: Tất cả nhãn (labels), tiêu đề cột, placeholder, thông báo toast **100% bắt buộc dùng `useTranslation`** và khai báo đầy đủ cả 2 ngôn ngữ tại `src/shared/i18n/locales/*/common.json`.
4. **Co-locate Styles**: Nếu component cần style phức tạp hoặc animation, đặt file `.module.scss` ngay cạnh component đó (ví dụ: `OrderQueuePage.module.scss`).

### ❌ DO NOT (Tuyệt đối tránh):

1. **Không hardcode màu sắc**: Không viết `style={{ color: '#ff0000' }}` hoặc dùng mã màu không nằm trong token.
2. **Không tạo khoảng cách quá thưa**: Không dùng padding/margin lớn (như `padding: 48px`, `gap: 32px`) trên các trang danh sách hay form nghiệp vụ.
3. **Không tự dựng lại Table / Modal từ đầu**: Không dùng `<table>` thuần hoặc tự viết modal bằng `<div>` nổi; phải dùng `CoreDataTable`, `DetailDrawer` hoặc `Modal` của AntD.
4. **Không cài thêm thư viện UI**: Không cài thêm UI kit khác (như MUI, Mantine, Chakra, shadcn/ui) làm phình bundle và xung đột thiết kế.
