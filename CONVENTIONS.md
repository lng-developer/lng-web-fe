# CONVENTIONS.md — Quy chuẩn dự án `lng-web-fe`

Tài liệu này là **quy chuẩn bắt buộc** khi phát triển dự án. Mọi PR nên tuân theo cấu trúc,
naming convention và pattern được mô tả ở đây.

## 1. Tech stack

| Nhóm            | Công nghệ                                                                      | Vai trò                                                        |
| --------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Core            | React 19 (TS/TSX), Vite 8                                                      | Build tool, UI library                                         |
| Styling         | Ant Design 6 (Token Engine), SCSS Modules                                      | Component design system, theme tokens, layout & style phức tạp |
| Routing         | React Router 7 (`createBrowserRouter`, dynamic `lazy()`)                       | Router SPA, route-level code splitting                         |
| Server state    | TanStack Query 5 (Query Key factories, invalidation, mutation)                 | Fetch/cache/sync dữ liệu server, mutation handling             |
| Client state    | Zustand 5 (UI state)                                                           | UI state cục bộ & tương tác workbench                          |
| Form & validate | Ant Design Form (Typed `Form.Item` rules, client-side validation)              | Quản lý form, field validation                                 |
| i18n            | react-i18next (`useTranslation`, đồng bộ `vi/common.json` & `en/common.json`)  | Đa ngôn ngữ song song vi/en                                    |
| Notification    | `useFeedbackToast` (`@/shared/ui`) / Ant Design `App` (message / notification) | Feedback toast, thông báo người dùng                           |
| Date            | dayjs                                                                          | Format/parse ngày giờ                                          |
| HTTP            | axios (Tập trung tại `@/shared/api/client.ts` với 401 refresh token mutex)     | Gọi API qua HTTP client dùng chung                             |
| Lint/format     | ESLint + Prettier                                                              | Code style, format tự động                                     |
| Git hooks       | Husky + lint-staged                                                            | Lint/format tự động trước khi commit                           |

## 2. Cấu trúc thư mục

```
public/
  favicon.svg

src/
├── main.tsx                  # Entry point, import global styles & bootstrapApp
├── app/
│   ├── bootstrap.tsx          # Xác thực ban đầu & render root bọc ContentErrorBoundary
│   ├── App.tsx                # Compose AppProviders + RouterProvider
│   ├── layout/                # AppShell, AppHeader, AppSidebar, PageContainer
│   ├── providers/             # AppProviders (I18nextProvider, ThemeProvider, AntdApp, QueryClientProvider)
│   └── router/                # Router config (router.tsx, createBrowserRouter với lazy(), guards)
├── features/                  # Module nghiệp vụ theo bounded domain
│   └── <feature-name>/
│       ├── api/                 # TanStack Query hooks, query key factories, API adapters
│       ├── components/          # Component riêng của feature (co-locate .module.scss)
│       ├── hooks/               # Custom hooks & UI store của feature
│       └── pages/               # Page components — route targets (co-locate .module.scss)
├── shared/                    # Tài nguyên dùng chung độc lập domain
│   ├── api/                   # axios client (client.ts), error normalizer (apiError.ts)
│   ├── auth/                  # Session management, token storage, PermissionBoundary
│   ├── config/                # env.ts, app configuration
│   ├── constants/             # Enums, static configurations
│   ├── hooks/                 # Custom React hooks dùng chung
│   ├── i18n/                  # i18n instance & locales (locales/{vi,en}/common.json)
│   ├── media/                 # Shared media helpers & utilities
│   ├── query/                 # queryClient config & GlobalMutationToastProvider
│   ├── theme/                 # Ant Design token theme engine (ThemeProvider, theme.ts)
│   └── ui/                    # Shared UI primitives (PageHeader, StatusTag, PopupModal, useFeedbackToast...)
├── styles/
│   └── global.scss            # Global styles, Ant Design theme resets, utility classes
└── test/                      # Test mirror theo domain ngoài feature (src/test/<feature>/...)
```

### Nguyên tắc đặt code

- **Chung toàn app** (dùng ở ≥ 2 feature, độc lập nghiệp vụ):
  - Đặt tại `src/shared/*` (`ui/`, `theme/`, `api/`, `query/`, `auth/`, `i18n/`, `config/`, `constants/`, `hooks/`).
  - Cấu trúc layout, providers, bootstrap, router đặt tại `src/app/*`.
- **Riêng của một nghiệp vụ**:
  - Đặt trong `src/features/<feature-name>/` với các folder `api/`, `components/`, `pages/`, `hooks/`.
  - Co-locate file `.module.scss` trực tiếp bên cạnh component hoặc page tương ứng.
  - Phân tách theo bounded-domain rõ ràng (ví dụ: `auth/accounts/`, `auth/roles/`, `auth/permissions/`), không để collection file rời rạc ở root feature.
- **Unit & UI tests**:
  - Đặt ngoài production feature folders, tại `src/test/<feature>/...` mirror cấu trúc domain của feature.
  - Sử dụng absolute import qua alias `@/features/*` từ test files.
- **Tái sử dụng shared UI**:
  - Luôn kiểm tra `src/shared/ui/` trước khi tạo component UI mới.
  - Import shared primitives qua alias `@/shared/*`.

## 3. Quy ước đặt tên

| Đối tượng              | Convention                                    | Ví dụ                                         |
| ---------------------- | --------------------------------------------- | --------------------------------------------- |
| Folder                 | kebab-case                                    | `features/access-control/`                    |
| File component (React) | PascalCase, `.tsx`, 1 component/file          | `UserCard.tsx`                                |
| SCSS Module            | PascalCase theo tên component, `.module.scss` | `UserCard.module.scss`                        |
| Hook                   | camelCase, tiền tố `use`, `.ts` / `.tsx`      | `useDebouncedValue.ts`                        |
| Zustand store          | camelCase, tiền tố `use...Store`, `.ts`       | `useOrderActionStore.ts`                      |
| TanStack Query hook    | `use<Resource><Query \| Mutation>`            | `useOrderListQuery`, `useUpdateOrderMutation` |
| Query key factory      | `<feature>.keys.ts` hoặc `<feature>Keys`      | `orderKeys.list()`                            |
| Form Item Rule         | Typed Ant Design `Rule[]` / rule validator    | `rules={[{ required: true }]}`                |
| Hằng số                | UPPER_SNAKE_CASE cho giá trị, file camelCase  | `STORAGE_KEYS.TOKEN`                          |
| Utils/helpers          | camelCase, named export, pure function        | `formatCurrency()`                            |

## 4. Quy ước viết component

- Functional component bằng `function` hoặc `const`, có định nghĩa kiểu TypeScript rõ ràng qua `interface` hoặc `type`:

```tsx
interface UserCardProps {
  user: User
  onEdit?: (user: User) => void
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return <div className={styles.container}>{user.name}</div>
}
```

- Destructure props ngay trong tham số hàm. Không sử dụng `propTypes` — toàn bộ codebase chuẩn hóa bằng TypeScript.
- Khai báo export: ưu tiên named export cho component; với các route page có thể dùng named export hoặc default export tương thích với dynamic `lazy()`.
- Styling: Sử dụng các Ant Design components chuẩn kết hợp SCSS Modules (`*.module.scss`). Tận dụng token từ `theme.useToken()` khi cần tính toán style theo theme động.

## 5. Styling: Ant Design 6 (Token Engine) & SCSS Modules

**Nguyên tắc chọn công cụ:**

- **Ant Design 6**: Nền tảng component library chính cho hệ thống B2B/Workbench (Button, Input, Select, Table, Modal, Drawer, Form, Card, Tag, Alert, Dropdown, Menu, Tooltip...).
- **Ant Design Token Engine (`src/shared/theme/theme.ts`)**:
  - Toàn bộ design token (màu sắc, border radius, typography scale, box shadow, control height) được cấu hình tập trung trong hàm `createAppTheme`.
  - Phân tách theo thuật toán: `theme.defaultAlgorithm` (light mode) và `theme.darkAlgorithm` (dark mode).
  - Chuẩn hóa màu chủ đạo `colorPrimary: '#2563eb'`, cùng hệ thống surface colors (`colorBgBase`, `colorBgContainer`, `colorBgLayout`) và text colors đồng nhất theo `DESIGN.md`.
- **SCSS Modules (`*.module.scss`)**:
  - Dùng cho custom layout, high-density workbenches, grid hệ thống, custom scrollbar, table cell formatting và animations phức tạp.
  - Đặt cùng folder với component: `Component.module.scss`.
- **Global Styles (`src/styles/global.scss`)**:
  - Chứa CSS resets, font import ('Plus Jakarta Sans', 'Poppins'), scrollbar toàn cục và các class tiện ích bổ trợ.

**Chế độ Appearance (Dark Mode):**

- Quản lý qua `src/shared/theme/ThemeProvider.tsx` với 3 chế độ: `'light' | 'dark' | 'system'`.
- Persist lựa chọn của người dùng trong `localStorage` với key `lng-web-appearance`.
- Tự động đồng bộ với hệ thống thông qua `resolveAppearance`. Khi dark mode kích hoạt, toàn bộ component Ant Design tự động nhận token của `theme.darkAlgorithm`.

## 6. State management — Zustand

- Dùng cho **UI state** cục bộ phức tạp hoặc tương tác giữa các thành phần workbench (ví dụ: quản lý modal đang mở, action bar, selected items).
- Store UI đặt trong `src/features/<feature>/hooks/` hoặc `src/features/<feature>/store/`.
- Sử dụng **selector** khi đọc state để tránh re-render không cần thiết:

```ts
const orderAction = useOrderActionStore((state) => state.orderAction)
const openOrderModal = useOrderActionStore((state) => state.openOrderModal)
```

- Không lạm dụng Zustand để lưu trữ dữ liệu server. Toàn bộ dữ liệu server phải được quản lý bởi TanStack Query.

## 7. Data fetching — TanStack Query

- 1 `QueryClient` chung tại `src/shared/query/queryClient.ts` (cấu hình mặc định: `staleTime: 60_000`, `refetchOnWindowFocus: false`, `retry: 1`).
- Mỗi feature tổ chức theo pattern:
  - Query-key factory: gom các keys liên quan để quản lý tập trung và tránh trùng lặp.
  - Custom query / mutation hooks: bọc `useQuery` và `useMutation`, gọi qua `apiClient` từ `@/shared/api/client`.

```ts
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), filters] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
}

export function useOrderListQuery(filters: OrderFilters) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => fetchOrders(filters),
  })
}
```

- Mutation thành công → gọi `queryClient.invalidateQueries(...)` để refetch dữ liệu server liên quan.
- Tích hợp `GlobalMutationToastProvider` (`src/shared/query/GlobalMutationToastProvider.tsx`): tự động lắng nghe lỗi từ mutation và hiển thị thông báo lỗi qua `useFeedbackToast`, trừ khi mutation có tùy chọn `meta: { skipGlobalToast: true }` hoặc tự xử lý `onError`.

## 8. API layer — axios & endpoints

- HTTP client tập trung tại `src/shared/api/client.ts`:
  - `apiClient`: instance axios dùng cho hầu hết các API nghiệp vụ.
  - `uploadApiClient`: instance riêng với timeout lớn (120s) phục vụ upload tệp tin.
  - `refreshClient`: instance riêng dùng riêng cho luồng refresh token.
- `baseURL` được cấu hình qua `src/shared/config/env.ts` (`env.apiBaseUrl`).
- **Request interceptor**: Tự động lấy access token từ session (`getAccessToken()`) và gắn header `Authorization: Bearer <token>`.
- **401 Refresh Token Mutex**:
  - Khi nhận response 401 từ backend, client tạm hoãn các request tiếp theo và đưa vào `failedQueue`.
  - Thực hiện gọi refresh token duy nhất qua `refreshClient.post('/api/auth/refresh')`.
  - Nếu refresh thành công: cập nhật access token mới, retry toàn bộ request trong hàng đợi.
  - Nếu refresh thất bại: gọi `expireSession()`, dọn dẹp phiên và kích hoạt chuyển hướng đăng nhập.
- **Chuẩn hóa lỗi API**: Toàn bộ lỗi được chuyển đổi qua `normalizeApiError` (`src/shared/api/apiError.ts`) để đảm bảo format lỗi chuẩn (`status`, `message`, `code`, `details`).
- Mọi hàm gọi API phải đặt trong `features/<name>/api/`. **Không** gọi `apiClient` trực tiếp từ component/page.

## 9. Routing — React Router v7

- Khai báo cấu hình router tại `src/app/router/router.tsx` bằng `createBrowserRouter`.
- **Code splitting**: Toàn bộ route pages được nạp bất đồng bộ qua dynamic `lazy: () => import(...)` trên từng route definition.
- **Route guards**:
  - Bảo vệ các bước thiết lập tài khoản qua guards: `requireWorkspace`, `requirePasswordSetup`, `requireProfileSetup`.
  - Phân quyền trang qua `PermissionBoundary` (`@/shared/auth/PermissionBoundary`) hoặc `PortalPageBoundary` (kiểm tra permissions như `CATALOG:READ`, `ORDERS:WRITE`...).
- Layout vỏ: `AppShell` (`src/app/layout/AppShell.tsx`) đóng vai trò container bao bọc header, sidebar, navigation, và `<Outlet />`.

## 10. Form & validation — Ant Design Form

- Quản lý form tập trung với Ant Design `<Form>` và `Form.useForm()`. Định kiểu dữ liệu mạnh mẽ bằng generic type `<Form<FormValues>>`.
- **Validation**:
  - Định nghĩa rules trực tiếp trên `<Form.Item rules={[...]} />`.
  - Hỗ trợ các rule chuẩn: `required`, `type: 'email'`, `min`, `max`, `pattern`, hoặc custom validator function.
  - Client-side validation: thông báo lỗi hiển thị inline ngay dưới trường nhập liệu.

```tsx
<Form<LoginValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
  <Form.Item
    name="identifier"
    label={t('auth.login.identifier')}
    rules={[{ required: true, message: t('auth.login.identifierRequired') }]}
  >
    <Input size="large" placeholder="user@company.com" />
  </Form.Item>
  <Form.Item
    name="password"
    label={t('auth.login.password')}
    rules={[{ required: true, message: t('auth.login.passwordRequired') }]}
  >
    <Input.Password size="large" />
  </Form.Item>
  <Button type="primary" htmlType="submit">
    {t('auth.login.submit')}
  </Button>
</Form>
```

- **Message lỗi**: Luôn lấy từ translation qua `t('...')`, tuyệt đối không hardcode chuỗi text trong rules.

## 11. i18n — react-i18next

- Tệp tin ngôn ngữ: `src/shared/i18n/locales/{vi,en}/common.json`.
- Sử dụng hook `useTranslation()` và hàm `t('namespace.key')` trong component.
- **Quy tắc bắt buộc**: Khi bổ sung bất kỳ text mới nào, phải thêm đồng thời key vào **cả 2 file**:
  - `src/shared/i18n/locales/vi/common.json`
  - `src/shared/i18n/locales/en/common.json`
- Không hardcode chuỗi text hiển thị trên UI.

## 12. Notification — `useFeedbackToast` & Ant Design `App`

- Ứng dụng bọc `<AntdApp>` từ `antd` tại `src/app/providers/AppProviders.tsx` để cung cấp context cho notification, message và modal.
- **Feedback Toast**:
  - Sử dụng hook `useFeedbackToast()` từ `@/shared/ui`:
    ```ts
    const showFeedbackToast = useFeedbackToast()
    showFeedbackToast('success', t('common.savedSuccessfully'), t('common.savedDescription'))
    ```
  - Hỗ trợ các type: `'success' | 'error' | 'warning' | 'info'`.
- **Ant Design App Context**:
  - Sử dụng `AntdApp.useApp()` khi cần truy cập trực tiếp `message`, `notification` hoặc `modal.confirm`.
- **Global Mutation Toast**:
  - `GlobalMutationToastProvider` tự động bắt lỗi các mutation thất bại và hiển thị feedback toast.
- **Tuyệt đối không dùng**: `window.alert()`, `window.confirm()`, hoặc các thư viện bên ngoài không đồng bộ với design system.

## 13. Thứ tự import & alias `@/`

ESLint (`eslint-plugin-simple-import-sort`) tự động sắp xếp import theo 4 nhóm, cách nhau 1 dòng trống:

1. **Side-effect imports** — `import './foo.scss'`, `import '@/shared/i18n/i18n'`.
2. **react / react-\* trước, third-party packages sau** (`react`, `react-dom`, `react-router-dom`, `antd`, `@ant-design/icons`, `@tanstack/react-query`, `axios`, `dayjs`, `zustand`...).
3. **Import nội bộ qua alias `@/`** — `@/app/...`, `@/features/...`, `@/shared/...`.
4. **Import tương đối** — `./Component`, `../api/order.api`, `*.module.scss`.

Chạy `npm run lint:fix` để tự động sắp xếp. Luôn dùng alias `@/` cho import xuyên thư mục; chỉ dùng import tương đối cho các file trong cùng một thư mục/subfolder.

## 14. Biến môi trường

- Cấu hình theo môi trường Vite:
  - `.env.development`: Môi trường dev server.
  - `.env.localdev`: Môi trường kết nối mock/local services.
  - `.env.production`: Môi trường production build.
- Toàn bộ biến môi trường truy cập tập trung qua `src/shared/config/env.ts` (`env.apiBaseUrl`, `env.uploadApiBaseUrl`, v.v.). Không đọc trực tiếp `import.meta.env` rải rác trong component.
- Biến môi trường expose ra client bắt buộc có tiền tố `VITE_`.
- Không commit các file chứa secret (`.env.local`, `.env.*.local`).

## 15. Lint, format, git hooks

- `npm run lint` / `npm run lint:fix` — ESLint (flat config `eslint.config.js`).
- `npm run format` — Prettier (theo `.prettierrc.json`).
- `npm run typecheck` — TypeScript typecheck (`tsc -b`).
- Husky `pre-commit` chạy `lint-staged` (tự động format và kiểm tra lint cho các file staged trước khi commit).
- Không dùng cờ `--no-verify` để bỏ qua git hooks.

## 16. Quy ước commit message

Khuyến nghị theo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <mô tả ngắn>

feat(orders): thêm modal xác nhận giao hàng
fix(auth): sửa lỗi 401 refresh token race condition
docs(conventions): đồng bộ tài liệu tech stack với Ant Design v6
```

Các `type` chuẩn: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`.

## 17. Không hardcode — Text & Style khi phát triển UI mới

### Text hiển thị

- Mọi chuỗi ký tự hiển thị (tiêu đề, nhãn, placeholder, nút bấm, thông báo, aria-label) bắt buộc dùng qua `useTranslation()` + `t('...')`.
- Bổ sung song song cả tiếng Việt và tiếng Anh trong `src/shared/i18n/locales/{vi,en}/common.json`.
- Ngoại lệ: Mã kỹ thuật, enum value không hiển thị cho người dùng.

### Style, màu sắc & kích thước

- **Không hardcode** mã màu hex, rgb hay kích thước px tùy tiện trong JSX (`style={{ color: '#2563eb', padding: '12px' }}`).
- Màu sắc & tokens: Sử dụng token từ Ant Design (`theme.useToken()`) hoặc các biến SCSS chuẩn hóa.
- Spacing & Layout: Định nghĩa trong file SCSS Module (`[Name].module.scss`) với cấu trúc high-density phù hợp tiêu chuẩn `DESIGN.md`.
- Chuẩn chiều cao control: 36px cho Buttons, Inputs, Selects, DatePickers.

### Keys & Configuration Literals

- Các chuỗi literal so sánh logic, key lưu trữ, action types phải được định nghĩa thành hằng số trong `src/shared/constants/` hoặc hằng số riêng của feature.
- Đường dẫn API luôn định nghĩa trong feature API / shared API layer, không hardcode string URL rải rác trong component.
