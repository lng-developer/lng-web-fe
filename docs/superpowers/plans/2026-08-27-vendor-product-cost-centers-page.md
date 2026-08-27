# Kế hoạch triển khai trang Cost Centers của sản phẩm Vendor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay Drawer danh sách cost center bằng trang `/portal/vendors/products/:productId/cost-centers` có đầy đủ thao tác hiện tại.

**Architecture:** Trang Vendor chuyên biệt lấy `productId` từ React Router, query product/cost centers bằng `vendorApi` và `vendorKeys`. Trang sở hữu state search, phân trang, import và editor; Workspace chỉ điều hướng từ Products và không giữ Drawer state.

**Tech Stack:** React 19, React Router 7, TanStack Query, Ant Design, `CoreDataTable`, react-i18next, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-vendor-product-cost-centers-page-design.md`

## Global Constraints

- Chỉ dùng API adapter/query key có sẵn trong `src/features/portal/vendors/api/`.
- Quyền ghi dùng `hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })`.
- Copy mới có key tương ứng trong cả i18n tiếng Anh và tiếng Việt.
- Dùng `CoreDataTable`, không thêm dependency; test ở `src/test/portal/vendors/pages/`.

---

### Task 1: Route và khung trang cost centers

**Files:**

- Create: `src/features/portal/vendors/pages/VendorProductCostCentersPage.tsx`
- Create: `src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx`
- Modify: `src/app/router/router.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: `getVendorProduct(productId)`, `listVendorCostCenters(productId, params)`, `vendorKeys.costCenters(productId, params)`.
- Produces: route `portal/vendors/products/:productId/cost-centers`, guard `VENDORS:READ`, product context header.

- [ ] **Step 1: Viết test đỏ cho route và context sản phẩm**

```tsx
test('loads cost centers by the product ID in the route', async () => {
  renderAt('/portal/vendors/products/product-1/cost-centers')
  expect(await screen.findByText('Product one')).toBeVisible()
  expect(listVendorCostCenters).toHaveBeenCalledWith(
    'product-1',
    expect.objectContaining({ page: 1, limit: 20 }),
  )
})
```

- [ ] **Step 2: Chạy test đỏ**

Run: `npm.cmd run test:ui -- src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx`

Expected: FAIL vì route/page chưa tồn tại.

- [ ] **Step 3: Thêm lazy route và page query shell**

```tsx
const { productId = '' } = useParams()
const navigate = useNavigate()
const product = useQuery({
  queryKey: vendorKeys.product(productId),
  queryFn: () => getVendorProduct(productId),
  enabled: Boolean(productId),
  retry: false,
})
```

Thêm route cạnh `portal/vendors`, bọc `PortalPageBoundary anyOf={['VENDORS:READ']} globalOnly`. Header có nút quay lại `/portal/vendors`, tên/mã product, vendor và status. Thêm i18n cho quay lại, heading và product không tồn tại.

- [ ] **Step 4: Chạy test xanh**

Run: `npm.cmd run test:ui -- src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit route/page shell**

```bash
git add src/app/router/router.tsx src/features/portal/vendors/pages/VendorProductCostCentersPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx
git commit -m "feat(vendors): add product cost centers route"
```

### Task 2: Bảng và thao tác cost center trên trang mới

**Files:**

- Modify: `src/features/portal/vendors/pages/VendorProductCostCentersPage.tsx`
- Modify: `src/shared/i18n/locales/en/common.json`
- Modify: `src/shared/i18n/locales/vi/common.json`
- Modify: `src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx`

**Interfaces:**

- Consumes: `VendorCostCenterEditorModal`, `importVendorCostCenters`, `vendorKeys.costCentersRoot`, `vendorKeys.productsRoot`.
- Produces: search, common pagination/page-size, Add, Import và Edit cho một product.

- [ ] **Step 1: Viết test đỏ cho phân trang và Add**

```tsx
test('changes page size and refetches the API', async () => {
  renderAt('/portal/vendors/products/product-1/cost-centers')
  await userEvent.selectOptions(await screen.findByLabelText(/rows per page/i), '50')
  expect(listVendorCostCenters).toHaveBeenLastCalledWith(
    'product-1',
    expect.objectContaining({ page: 1, limit: 50 }),
  )
})
```

- [ ] **Step 2: Chạy test đỏ**

Run: `npm.cmd run test:ui -- src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx`

Expected: FAIL vì page chưa có table/action.

- [ ] **Step 3: Chuyển bảng từ Drawer vào page**

```tsx
const [search, setSearch] = useState('')
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState(20)
const params = useMemo(
  () => ({ page, limit: pageSize, q: search.trim() || undefined }),
  [page, pageSize, search],
)
```

Dùng `CoreDataTable` với các cột Code, Name, SKU, Base cost, Status và Actions, `scroll={{ x: 900 }}`, căn trái dữ liệu và Actions cuộn cùng bảng. Pagination truyền `current`, `pageSize`, `total`, `onChange`, không đặt `showSizeChanger: false`.

- [ ] **Step 4: Chuyển Add/Edit/Import vào page**

Dùng `hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })`. Add/Edit mở `VendorCostCenterEditorModal` hiện có với `productId` và `product.vendor?.id ?? ''`. Chuyển state/modal import CSV cho cost center từ Workspace sang page, giữ preview/validation; sau import invalidate `vendorKeys.costCentersRoot(product.id)` và `vendorKeys.productsRoot(vendorId)`.

- [ ] **Step 5: Chạy test xanh**

Run: `npm.cmd run test:ui -- src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit detail workspace**

```bash
git add src/features/portal/vendors/pages/VendorProductCostCentersPage.tsx src/shared/i18n/locales/en/common.json src/shared/i18n/locales/vi/common.json src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx
git commit -m "feat(vendors): move cost centers into detail page"
```

### Task 3: Điều hướng từ Products và bỏ Drawer cũ

**Files:**

- Modify: `src/features/portal/vendors/pages/VendorWorkspaceProductsTabPage.tsx`
- Modify: `src/features/portal/vendors/pages/VendorWorkspacePage.tsx`
- Delete: `src/features/portal/vendors/pages/VendorWorkspaceCostCenterDrawer.tsx`
- Modify: `src/test/portal/vendors/pages/VendorWorkspacePage.test.tsx`
- Create: `src/test/portal/vendors/pages/VendorWorkspaceProductsTabPage.test.tsx`

**Interfaces:**

- Consumes: route detail mới và product ID ở từng row.
- Produces: Manage cost centers điều hướng đến `/portal/vendors/products/${product.id}/cost-centers`; Workspace không còn Drawer/query cost center.

- [ ] **Step 1: Viết test đỏ cho điều hướng**

```tsx
test('navigates to the selected product cost centers page', async () => {
  renderProductsTab()
  await userEvent.click(screen.getByRole('button', { name: /manage cost centers/i }))
  expect(mockNavigate).toHaveBeenCalledWith('/portal/vendors/products/product-1/cost-centers')
})
```

- [ ] **Step 2: Chạy test đỏ**

Run: `npm.cmd run test:ui -- src/test/portal/vendors/pages/VendorWorkspaceProductsTabPage.test.tsx`

Expected: FAIL vì tab còn callback mở Drawer.

- [ ] **Step 3: Thay callback bằng điều hướng và xóa Drawer**

Trong Products tab dùng `useNavigate()` và gọi `navigate(`/portal/vendors/products/${row.id}/cost-centers`)`. Xóa prop `onOpenCostCenters`. Trong Workspace xóa state selected product, search/page/query cost center, import/render Drawer và import `VendorWorkspaceCostCenterDrawer`. Chỉ xóa file Drawer sau khi `rg` xác nhận không còn import; giữ `VendorCostCenterEditorModal`.

- [ ] **Step 4: Chạy test xanh và kiểm tra toàn bộ**

Run:

```bash
npm.cmd run test:ui -- src/test/portal/vendors/pages/VendorWorkspaceProductsTabPage.test.tsx src/test/portal/vendors/pages/VendorWorkspacePage.test.tsx src/test/portal/vendors/pages/VendorProductCostCentersPage.test.tsx
npm.cmd run lint
npm.cmd run build
```

Expected: các focused UI tests PASS, lint chỉ có warning plugin React đã tồn tại, build kết thúc bằng `✓ built`.

- [ ] **Step 5: Commit thay đổi điều hướng**

```bash
git add src/features/portal/vendors/pages/VendorWorkspaceProductsTabPage.tsx src/features/portal/vendors/pages/VendorWorkspacePage.tsx src/features/portal/vendors/pages/VendorWorkspaceCostCenterDrawer.tsx src/test/portal/vendors/pages/VendorWorkspaceProductsTabPage.test.tsx src/test/portal/vendors/pages/VendorWorkspacePage.test.tsx
git commit -m "refactor(vendors): replace cost center drawer with page"
```
