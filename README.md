# LNG Web FE

Base project: React 19 (JS) + Vite + Tailwind CSS + SCSS + MUI + TanStack Query + Zustand.

Quy chuẩn cấu trúc thư mục, naming convention, và pattern cho từng phần (styling, state,
data fetching, form, i18n...) được mô tả chi tiết trong **[CONVENTIONS.md](./CONVENTIONS.md)**.
Khi tạo feature mới, hãy copy cấu trúc của `src/features/home` làm khuôn mẫu.

## Yêu cầu

- Node.js >= 20

## Bắt đầu

```bash
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run dev
```

App chạy tại `http://localhost:3000`.

## Scripts

| Script             | Mô tả                                     |
| ------------------ | ----------------------------------------- |
| `npm run dev`      | Chạy dev server (Vite)                    |
| `npm run build`    | Build production vào `dist/`              |
| `npm run preview`  | Preview bản build                         |
| `npm run lint`     | Kiểm tra ESLint                           |
| `npm run lint:fix` | Tự sửa lỗi ESLint (bao gồm thứ tự import) |
| `npm run format`   | Format code với Prettier                  |

## Demo

Trang `Home` (`src/features/home`) minh hoạ toàn bộ stack:

- Layout MUI (AppBar/Drawer) kết hợp Tailwind utilities (`MainLayout`)
- Đổi ngôn ngữ vi/en (react-i18next + Zustand persist)
- Dữ liệu mẫu qua TanStack Query (`useHomeSummaryQuery`)
- Form react-hook-form + zod, hiển thị kết quả qua notistack
