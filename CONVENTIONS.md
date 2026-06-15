# CONVENTIONS.md — Quy chuẩn dự án `lng-web-fe`

Tài liệu này là **quy chuẩn bắt buộc** khi phát triển dự án. Mọi PR nên tuân theo cấu trúc,
naming convention và pattern được mô tả ở đây. Khi cần tạo một module/feature mới, hãy copy
cấu trúc của `src/features/home` làm khuôn mẫu.

## 1. Tech stack

| Nhóm            | Công nghệ                                            | Vai trò                                         |
| --------------- | ---------------------------------------------------- | ----------------------------------------------- |
| Core            | React 19 (JS/JSX), Vite                              | Build tool, UI library                          |
| Styling         | Tailwind CSS 4, MUI 9 (Emotion), SCSS                | Layout/utility, component/theme, style phức tạp |
| Routing         | React Router 7                                       | `createBrowserRouter`, lazy-loaded pages        |
| Server state    | TanStack Query 5                                     | Fetch/cache/sync dữ liệu server                 |
| Client state    | Zustand 5                                            | UI state, preferences (persist)                 |
| Form & validate | react-hook-form + zod + @hookform/resolvers          | Quản lý form, schema validation                 |
| i18n            | react-i18next                                        | Đa ngôn ngữ vi/en                               |
| Notification    | notistack                                            | Toast/snackbar                                  |
| Date            | dayjs                                                | Format/parse ngày giờ                           |
| HTTP            | axios                                                | Gọi API qua 1 instance dùng chung               |
| Lint/format     | ESLint (flat config) + Prettier + simple-import-sort | Code style, import order                        |
| Git hooks       | Husky + lint-staged                                  | Lint/format tự động trước khi commit            |

## 2. Cấu trúc thư mục

```
public/
  favicon.svg

src/
├── main.jsx                  # Entry point, import global styles + render <App/>
├── app/
│   ├── App.jsx                # Compose AppProviders + RouterProvider
│   └── providers/
│       └── AppProviders.jsx   # QueryClient, MUI ThemeProvider, SnackbarProvider, i18n init
├── assets/                    # Ảnh, icon tĩnh (import trực tiếp trong component)
│   ├── images/
│   └── icons/
├── components/                # Component dùng chung toàn app
│   ├── common/                 # Loader, ErrorBoundary, EmptyState...
│   └── form/                   # FormTextField, FormSelect... (wrap MUI + RHF)
├── constants/
│   ├── app.js                  # App-level constants: modes, languages, storage keys, variants...
│   ├── env.js                  # Wrap import.meta.env
│   └── routes.js               # Hằng số route path
├── features/                  # Module nghiệp vụ (feature-based)
│   └── <feature-name>/
│       ├── api/                 # TanStack Query hooks + query-key factory
│       ├── components/          # Component chỉ dùng trong feature này
│       ├── hooks/                # Hook riêng của feature
│       ├── store/                # Zustand store riêng của feature (nếu cần)
│       └── pages/                # Page component - route target
├── hooks/                     # Hook dùng chung (useDebounce...)
├── i18n/
│   ├── index.js                # react-i18next init
│   └── locales/
│       ├── vi/common.json
│       └── en/common.json
├── layouts/                   # Layout shell (MainLayout, AuthLayout...)
├── lib/                       # Cấu hình thư viện bên thứ 3
│   ├── queryClient.js          # TanStack QueryClient
│   └── dayjs.js                # dayjs + plugin/locale
├── routes/
│   └── index.jsx              # createBrowserRouter + route definitions
├── services/                  # Gọi API: axios instance + endpoint path
│   ├── axiosInstance.js        # axios instance + interceptors (export apiClient)
│   └── endpoints.js            # Hằng số đường dẫn API, nhóm theo feature
├── store/                     # Zustand store global (UI state, auth...)
├── styles/
│   ├── tailwind.css            # Entry Tailwind (theme + utilities, bỏ preflight)
│   ├── _variables.scss         # Biến SCSS (kích thước layout, z-index...)
│   ├── _mixins.scss            # Mixin SCSS dùng chung
│   └── global.scss             # Global style (reset nhẹ, scrollbar...)
├── theme/                     # MUI theme
│   ├── index.js                # createAppTheme(mode) + components style overrides
│   ├── palette.js               # colorTokens (light/dark) + buildPalette
│   └── typography.js            # Typography scale
├── utils/                     # Hàm thuần (formatters, helpers...)
└── validations/               # zod schema cho form/validate (tập trung)
    ├── index.js                 # Re-export các schema
    └── <feature>Schema.js       # zod schema theo feature, ví dụ feedbackSchema.js
```

### Nguyên tắc đặt code

- **Chung toàn app** (dùng ở ≥ 2 feature) → đặt ở `components/`, `hooks/`, `store/`, `lib/`,
  `services/`, `theme/`, `i18n/`, `validations/`, `routes/`, `utils/`, `constants/`.
- **Riêng của 1 nghiệp vụ** → đặt trong `features/<feature-name>/...` tương ứng.
- Khi tạo feature mới, copy cấu trúc `src/features/home` (api, components, pages), thêm schema
  vào `src/validations/<feature>Schema.js` và đăng ký route trong `src/routes/index.jsx` +
  `src/constants/routes.js`.

## 3. Quy ước đặt tên

| Đối tượng              | Convention                                     | Ví dụ                            |
| ---------------------- | ---------------------------------------------- | -------------------------------- | ---------------------------------------------- |
| Folder                 | kebab-case                                     | `features/user-management/`      |
| File component (React) | PascalCase, default export, 1 component/file   | `UserCard.jsx`                   |
| Hook                   | camelCase, tiền tố `use`, named export         | `useDebounce.js` → `useDebounce` |
| Zustand store          | camelCase, tiền tố `use...Store`, named export | `useUIStore.js` → `useUIStore`   |
| TanStack Query hook    | `use<Resource><Query                           | Mutation>`                       | `useHomeSummaryQuery`, `useCreateUserMutation` |
| Query key factory      | `<feature>.keys.js`, object `<feature>Keys`    | `homeKeys.summary()`             |
| zod schema             | camelCase + `Schema`, named export             | `feedbackSchema`                 |
| Hằng số                | UPPER_SNAKE_CASE cho giá trị, file camelCase   | `ROUTES.HOME` trong `routes.js`  |
| Utils/helpers          | camelCase, named export, pure function         | `formatCurrency()`               |

## 4. Quy ước viết component

- Functional component, khai báo bằng `function`, **default export**:

```jsx
export default function UserCard({ user, onEdit }) {
  return <div>{user.name}</div>
}
```

- Destructure props ngay trong tham số hàm. Không dùng `propTypes` (đã tắt rule
  `react/prop-types` vì dùng JS thuần - nếu cần mô tả type, dùng JSDoc).
- Mỗi file chỉ export **1 component** (default) + có thể export thêm hằng số/hook liên quan
  nếu cần (theo rule `react-refresh/only-export-components`). Nếu file không phải component
  (ví dụ route config), thêm comment `eslint-disable react-refresh/only-export-components`
  kèm lý do — xem `src/routes/index.jsx`.
- Style ưu tiên: class Tailwind qua prop `className`, dùng `sx`/theme của MUI cho các thành
  phần design-system, SCSS module (`*.module.scss`) cho style phức tạp/animation.

## 5. Styling: Tailwind vs MUI vs SCSS

**Nguyên tắc chọn công cụ:**

- **Tailwind**: layout, spacing, flex/grid, responsive (`flex`, `gap-4`, `grid-cols-3`,
  `md:p-6`...) trên các element thường (`div`, `section`...).
- **MUI**: mọi component design-system (Button, TextField, Dialog, AppBar, Card...), theme
  (màu, typography, spacing scale) qua `sx` hoặc `src/theme/`.
- **SCSS module**: style phức tạp không tiện làm bằng utility/sx (animation, pseudo-element,
  override style của thư viện ngoài). Đặt cùng folder với component: `Component.module.scss`.

**Đồng bộ design tokens (quan trọng):**

- `src/theme/palette.js` (export `colorTokens` + `buildPalette`), `src/theme/index.js` (export
  `createAppTheme(mode)`) và `src/styles/tailwind.css` (`@theme` + `.dark{}`) phải khớp nhau —
  tokens lấy từ Figma "LNG v2" > Design System > Color Tokens (Light/Dark):
  - `breakpoints.values` (MUI, `src/theme/index.js`) ↔ `--breakpoint-*` (Tailwind): `sm:600
md:900 lg:1200 xl:1536`.
  - `colorTokens.light/dark` (MUI, `src/theme/palette.js`) ↔ `--color-*` trong `@theme` (light)
    và `.dark{}` (dark) — xem bảng mapping đầy đủ trong comment đầu `tailwind.css`. Ví dụ:
    `brand/primary` ↔ `--color-primary` ↔ `palette.primary.main`; `text/primary` ↔ `--color-ink`
    ↔ `palette.text.primary`.
  - Khi đổi 1 trong 2 file, **phải cập nhật file còn lại** để ví dụ `bg-page`/`text-ink`
    (Tailwind) và `theme.palette.background.default`/`theme.palette.text.primary` (MUI) luôn
    đồng nhất ở cả light và dark.

**Vì sao Tailwind preflight bị tắt?** `src/styles/tailwind.css` chỉ import
`tailwindcss/theme.css` + `tailwindcss/utilities.css`, **không** import preflight (reset CSS
mặc định của Tailwind). MUI `<CssBaseline />` (đăng ký trong `AppProviders`) đóng vai trò
reset CSS duy nhất, tránh 2 lớp reset xung đột nhau.

**Dark mode:**

- Nguồn duy nhất: `themeMode` (`'light' | 'dark'`) trong `useUIStore` (persist), đổi qua
  `toggleThemeMode()`/`setThemeMode()` — nút bật/tắt ở `MainLayout` (icon
  `LightModeIcon`/`DarkModeIcon`).
- `AppProviders` tạo MUI theme bằng `createAppTheme(themeMode)` (qua `useMemo`) và đồng bộ
  class `dark` trên `<html>` bằng `useEffect` (`document.documentElement.classList.toggle`).
- Tailwind dùng `@custom-variant dark (&:where(.dark, .dark *));` (class-based, **không** dùng
  `prefers-color-scheme`) — các biến `--color-*` được redefine trong `.dark{}` nên utility như
  `bg-page`/`text-ink` tự đổi màu theo class `dark` trên `<html>`, không cần thêm tiền tố
  `dark:` cho các token màu đã định nghĩa.

## 6. State management — Zustand

- 1 store cho 1 "concern" (UI prefs, auth, cart...), không dồn hết vào 1 store khổng lồ.
- Store global đặt ở `src/store/`, store riêng feature đặt ở `features/<name>/store/`.
- Dùng **selector** khi đọc state để tránh re-render thừa:

```js
const sidebarOpen = useUIStore((state) => state.sidebarOpen)
const toggleSidebar = useUIStore((state) => state.toggleSidebar)
```

- Dùng middleware `persist` cho dữ liệu cần lưu qua session (theme, ngôn ngữ, sidebar...) —
  xem `src/store/useUIStore.js`. Dùng `partialize` để chỉ persist field cần thiết.

## 7. Data fetching — TanStack Query

- 1 `QueryClient` chung tại `src/lib/queryClient.js` (default: `staleTime: 60_000`,
  `refetchOnWindowFocus: false`, `retry: 1`).
- Mỗi feature có:
  - `<feature>.keys.js` — query-key factory (object `<feature>Keys`):

    ```js
    export const homeKeys = {
      all: ['home'],
      summary: () => [...homeKeys.all, 'summary'],
    }
    ```

  - `<feature>.queries.js` / `<feature>.mutations.js` — custom hook bọc `useQuery`/`useMutation`,
    gọi hàm fetch dùng `apiClient` (từ `@/services/axiosInstance`) với path từ `ENDPOINTS`
    (`@/services/endpoints`):

    ```js
    export function useHomeSummaryQuery() {
      return useQuery({
        queryKey: homeKeys.summary(),
        queryFn: () => apiClient.get(ENDPOINTS.HOME.SUMMARY),
      })
    }
    ```

- Mutation thành công → `queryClient.invalidateQueries({ queryKey: homeKeys.all })` để
  refetch dữ liệu liên quan.
- Component dùng `isPending`/`isError`/`data` từ hook, không gọi `axios`/`fetch` trực tiếp
  trong component.

## 8. API layer — axios & endpoints

- 1 instance duy nhất: `src/services/axiosInstance.js` (export `apiClient`), `baseURL` lấy từ
  `src/constants/env.js` (`VITE_API_BASE_URL`).
- Request interceptor: tự gắn `Authorization: Bearer <token>` từ `localStorage`.
- Response interceptor: trả về `response.data` trực tiếp (component nhận data đã unwrap),
  lỗi được `reject` để TanStack Query xử lý qua `isError`/`error`.
- Đường dẫn API khai báo tập trung trong `src/services/endpoints.js` (object `ENDPOINTS`, nhóm
  theo feature, ví dụ `ENDPOINTS.HOME.SUMMARY`), không hard-code string path trong
  `<feature>.queries.js`/`.mutations.js`.
- Mọi gọi API đặt trong `features/<name>/api/`, **không** gọi `apiClient` trực tiếp từ
  component/page.

## 9. Routing — React Router v7

- Khai báo path trong `src/constants/routes.js` (object `ROUTES`), không hard-code string path
  trong component.
- `src/routes/index.jsx`: `createBrowserRouter`, page component load qua `React.lazy`.
- `MainLayout` bọc `<Outlet/>` trong 1 `<Suspense fallback={<Loader/>}>` duy nhất — các page
  con không cần tự thêm Suspense.
- Thêm route mới: thêm hằng số vào `ROUTES`, `lazy import` page, thêm vào `children` của router.

## 10. Form & validation — react-hook-form + zod

- Schema validate đặt tập trung ở `src/validations/<feature>Schema.js`, dùng `zod`, và được
  re-export qua `src/validations/index.js`.
- **Message lỗi của schema là i18n key** (ví dụ `'feedback.errors.nameRequired'`), không phải
  text cứng — để hỗ trợ đa ngôn ngữ:

  ```js
  export const feedbackSchema = z.object({
    name: z.string().min(1, 'feedback.errors.nameRequired'),
    email: z.email('feedback.errors.emailInvalid'),
  })
  ```

- Dùng `useForm({ resolver: zodResolver(schema) })`.
- Field MUI dùng chung `components/form/FormTextField.jsx` (wrap `TextField` qua RHF
  `Controller`, tự dịch `fieldState.error.message` bằng `useTranslation`). Tạo thêm
  `FormSelect`, `FormCheckbox`... theo cùng pattern khi cần.

## 11. i18n — react-i18next

- File ngôn ngữ: `src/i18n/locales/{vi,en}/common.json`, namespace mặc định `common`.
- Ngôn ngữ hiện tại lưu trong `useUIStore` (persist) — **đây là nguồn duy nhất**, không dùng
  thêm language-detector để tránh 2 nguồn xung đột.
- Đổi ngôn ngữ: gọi đồng thời `i18n.changeLanguage(lang)` và `setLanguage(lang)` (xem
  `MainLayout`).
- Dùng `useTranslation()` + `t('namespace.key')` trong component. Thêm namespace mới (ví dụ
  `<feature>.json`) nếu file `common.json` quá lớn, rồi khai báo trong `src/i18n/index.js`.

## 12. Notification — notistack

- `SnackbarProvider` đã đăng ký ở `AppProviders` (vị trí top-right, `autoHideDuration=3000`).
- Dùng hook `useSnackbar()` → `enqueueSnackbar(message, { variant })` với
  `variant: 'success' | 'error' | 'warning' | 'info'`.
- Lỗi API nên hiển thị qua `enqueueSnackbar(t('common.errors.generic'), { variant: 'error' })`
  tại nơi gọi mutation/query (hoặc qua `onError` callback), không `alert()`.

## 13. Thứ tự import & alias `@/`

ESLint (`eslint-plugin-simple-import-sort`) tự sắp xếp import theo 4 nhóm, cách nhau 1 dòng
trống:

1. **Side-effect imports** — `import './foo.css'`, `import '@/i18n'`.
2. **react/react-\* trước, các package ngoài khác sau** (react, react-dom, react-router-dom...
   rồi @mui/..., @tanstack/..., axios, zod, zustand...).
3. **Import nội bộ qua alias `@/`** — `@/components/...`, `@/lib/...`, `@/services/...`,
   `@/constants/...`.
4. **Import tương đối** — `./Component`, `../api/xxx.queries`, `*.module.scss`.

Chạy `npm run lint:fix` để tự sắp xếp. Luôn dùng alias `@/` cho import xuyên thư mục
(`src/...`); chỉ dùng import tương đối (`./`, `../`) cho file trong cùng feature/folder.

## 14. Biến môi trường

- Dùng env theo Vite mode:
  - `.env.development` cho môi trường dev (`npm.cmd run dev`, `npm.cmd run build:dev`).
  - `.env.production` cho môi trường production (`npm.cmd run build` hoặc `npm.cmd run build:prod`).
- `.env.example` chỉ là template chung khi cần tạo env riêng theo máy. Mọi biến phải có tiền tố `VITE_` để Vite
  expose ra client.
- Không đọc `import.meta.env` trực tiếp trong component/feature — luôn qua
  `src/constants/env.js` (object `env`).
- `.env`, `.env.local`, `.env.*.local` đã được `.gitignore` — **không commit** file chứa secret.

## 15. Lint, format, git hooks

- `npm run lint` / `npm run lint:fix` — ESLint (flat config, `eslint.config.js`).
- `npm run format` — Prettier theo `.prettierrc.json` (no semi, single quote, trailing comma).
- Husky `pre-commit` chạy `lint-staged` (ESLint --fix + Prettier cho file staged) — đã cấu
  hình trong `package.json` (`"lint-staged"`).
- Không dùng `--no-verify` để bypass hook trừ khi có lý do rõ ràng và được team đồng ý.

## 16. Quy ước commit message

Khuyến nghị theo [Conventional Commits](https://www.conventionalcommits.org/) (không enforce
bằng tool, nhưng nên tuân theo để changelog/lịch sử rõ ràng):

```
<type>(<scope>): <mô tả ngắn>

feat(home): thêm form feedback
fix(auth): sửa lỗi refresh token hết hạn
chore(deps): nâng cấp react-router lên v7
```

Các `type` phổ biến: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`.

## 17. Không hardcode — Text & Style khi phát triển UI mới

Khi phát triển một UI/feature mới, **không hardcode** text hiển thị, màu sắc, spacing, kích
thước, font... Mọi giá trị phải lấy từ nguồn chuẩn hóa (file i18n, design tokens) để dễ bảo trì
và đảm bảo đồng bộ toàn app.

### Text

- Mọi text hiển thị cho người dùng (label, title, placeholder, message lỗi/thành công, tooltip,
  aria-label, alt...) phải lấy qua `useTranslation()` + `t('namespace.key')`, **không** viết
  text cứng trực tiếp trong JSX (cả tiếng Việt và tiếng Anh).
- Thêm key mới vào **cả 2 file** `src/i18n/locales/vi/common.json` và
  `src/i18n/locales/en/common.json` (cùng cấu trúc, namespace theo feature - xem mục 11).
- Message lỗi của zod schema cũng phải là i18n key (xem mục 10), không phải text cứng.
- Ngoại lệ: giá trị kỹ thuật không hiển thị cho người dùng (key tra cứu, `value` của option,
  enum nội bộ...) không cần qua i18n.

### Style, màu sắc, spacing, kích thước

- **Không** dùng màu hex/rgb, kích thước px tùy ý viết trực tiếp trong component (ví dụ
  `style={{ color: '#E63946' }}`, `className="text-[#fff] p-[13px]"`, `sx={{ marginTop: '13px'
}}`...).
- Màu sắc: dùng `theme.palette`/`colorTokens` (MUI, qua `sx`/`src/theme/`) hoặc token Tailwind đã
  định nghĩa trong `tailwind.css` (`bg-page`, `text-ink`, `border-default`...) - xem mục 5. Cần
  màu mới → bổ sung vào `colorTokens` (`src/theme/palette.js`) **và** `@theme`/`.dark{}`
  (`tailwind.css`) cho cả light/dark, không thêm màu rời rạc tại chỗ dùng.
- Spacing/kích thước: dùng spacing scale của Tailwind (`gap-4`, `p-6`, `m-2`...) hoặc
  `theme.spacing()`/`theme.shape.borderRadius*` của MUI. Kích thước layout dùng chung (header
  height, sidebar width, z-index...) lấy từ biến trong `src/styles/_variables.scss` - cần giá
  trị mới thì thêm biến vào đây, không hardcode số trong các file SCSS khác.
- Breakpoint dùng `theme.breakpoints` (MUI) hoặc prefix responsive của Tailwind (`sm: md: lg:
xl:`) đã đồng bộ ở mục 5, không tự định nghĩa breakpoint riêng trong component.
- Font/typography: dùng `theme.typography` (variant `h1`, `body1`, `caption`...) hoặc class
  Tailwind tương ứng, không khai `fontSize`/`fontWeight`/`fontFamily` tùy ý trong component.

### Keys/config literals

- Không hardcode các key/config literal rải rác trong component, store, service, theme hoặc i18n
  init. Các giá trị dùng cho logic phải được gom vào `src/constants/app.js` hoặc file constants
  chuyên biệt.
- Các nhóm key bắt buộc đi qua constants:
  - theme mode / html class: `THEME_MODES.LIGHT`, `THEME_MODES.DARK`, `HTML_CLASSES.DARK`.
  - language code: `LANGUAGES.VI`, `LANGUAGES.EN`.
  - localStorage/sessionStorage key: `STORAGE_KEYS.*`.
  - API response field/key dùng cho parsing: `AUTH_RESPONSE_FIELDS.*`.
  - snackbar/toast variant: `SNACKBAR_VARIANTS.SUCCESS`, `ERROR`, `WARNING`, `INFO`.
  - elevation/shadow tái sử dụng: `ELEVATION_SHADOWS.*`.
- Endpoint path luôn đặt trong `src/services/endpoints.js` (`ENDPOINTS.*`), route path luôn đặt trong
  `src/constants/routes.js` (`ROUTES.*`), không viết trực tiếp trong feature/api/component.
- Ngoại lệ chấp nhận: literal chỉ dùng một lần và là giá trị hiển thị kĩ thuật cục bộ
  (ví dụ option demo trong UI Kit) có thể để tại chỗ, nhưng nếu được so sánh logic, persist, parse
  response, hoặc dùng ở hạn mức cross-file thì phải tạo constants.

Ví dụ đúng:

```js
import { LANGUAGES, SNACKBAR_VARIANTS, THEME_MODES } from '@/constants/app'

setThemeMode(THEME_MODES.DARK)
i18n.changeLanguage(LANGUAGES.VI)
enqueueSnackbar(t('feedback.success'), { variant: SNACKBAR_VARIANTS.SUCCESS })
```

Không viết:

```js
setThemeMode('dark')
i18n.changeLanguage('vi')
enqueueSnackbar(t('feedback.success'), { variant: 'success' })
```
