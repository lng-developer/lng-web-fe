# Thiết kế cấu trúc Vendor Workspace

## Mục tiêu

Tái cấu trúc UI vendor thành các đơn vị chứa cả UI và logic liên quan, nhưng giữ nguyên route, giao diện, API call, quyền truy cập, i18n và luồng thao tác hiện có.

## Phạm vi

- Chỉ tổ chức lại source và test của vendor.
- Giữ nguyên public API hiện tại tại `vendors/api/vendorApi.ts` và `vendors/api/vendorKeys.ts`.
- Không thay đổi backend contract, route path, nội dung hiển thị cho người dùng hay hành vi của feature.
- Không sửa các thay đổi đang có nhưng không liên quan tại integrations, orders, shared UI và i18n.

## Thiết kế thư mục

`pages/` vẫn là bề mặt route. Mỗi route page trở thành một thư mục: `index.tsx` là điểm vào để ghép UI, còn `use*.tsx` liền kề sở hữu phần điều phối dành riêng cho page đó.

```text
src/features/portal/vendors/
  api/
    vendorApi.ts
    vendorKeys.ts
  pages/
    VendorWorkspacePage/
      index.tsx
      useVendorWorkspace.tsx
      VendorWorkspacePage.module.scss
      VendorTabs/
        index.tsx
        useVendorTabs.tsx
      VendorTree/
        index.tsx
        useVendorTree.tsx
        VendorBranch.tsx
        VendorProductBranch.tsx
      VendorsTab/
        index.tsx
        useVendorsTab.tsx
      ProductsTab/
        index.tsx
        useProductsTab.tsx
        productMocks.ts
      MigrationTab/
        index.tsx
        useMigrationTab.tsx
      CostCenterDrawer/
        index.tsx
        useCostCenterDrawer.tsx
      dialogs/
        VendorEditorDialog/
          index.tsx
          useVendorEditorDialog.tsx
        VendorProductEditorDialog/
          index.tsx
          useVendorProductEditorDialog.tsx
        VendorCostCenterEditorDialog/
          index.tsx
          useVendorCostCenterEditorDialog.tsx
        VendorIntegrationDialog/
          index.tsx
          useVendorIntegrationDialog.tsx
    VendorProductCostCentersPage/
      index.tsx
      useVendorProductCostCentersPage.tsx
    VendorCostCenterEditorPage/
      index.tsx
      useVendorCostCenterEditorPage.tsx
```

## Ranh giới trách nhiệm

- `index.tsx` render đơn vị UI và chỉ gồm việc ghép presentation, props và event wiring. Không chứa query/mutation/form/import orchestration dài.
- `use*.tsx` sở hữu state và side effect dành riêng cho đơn vị UI cùng thư mục. Hook trả về một view model nhỏ cho `index.tsx` kế bên sử dụng.
- Leaf component không có điều phối cục bộ đáng kể, như các branch trong tree, được đặt cạnh component cha thay vì tạo hook gượng ép.
- Mỗi dialog folder tự sở hữu form state và mutation của nó, đồng thời giữ interface component export hiện tại ở mức có thể.
- `VendorWorkspacePage/index.tsx` là entry duy nhất của route; nó ghép tabs, dialogs và workspace hook, không chứa UI chi tiết của từng tab.
- Hai route page độc lập đang có được chuyển vào thư mục page riêng và dùng hook riêng cho page.

## Tương thích import và route

- Cập nhật lazy import của router để trỏ vào `index.tsx` trong thư mục page.
- Cập nhật source và test để import từ đường dẫn mới.
- Giữ default export của `VendorWorkspacePage` và named export đang được route/test sử dụng, trừ khi mọi local consumer được migrate cùng thay đổi này.
- Không tạo barrel file ngoài các entry `index.tsx` cục bộ.

## Test và kiểm chứng

- Di chuyển vendor test để mirror cấu trúc page/unit mới dưới `src/test/portal/vendors/`.
- Giữ behavioral test cho dialog, tree expansion/loading, tabs, cost center pages, migration review và vendor API.
- Chỉ thay source-path assertion tại nơi việc di chuyển làm thay đổi đường dẫn; giữ các assertion bảo vệ hành vi mong muốn.
- Chạy vendor test suite, sau đó `npm run lint`, rồi `npm run build`.
