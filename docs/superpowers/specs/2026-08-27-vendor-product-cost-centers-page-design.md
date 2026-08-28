# Trang chi tiết cost center của sản phẩm Vendor

## Mục tiêu

Thay Drawer danh sách cost center được mở từ **Manage cost centers** bằng một route chi tiết có thể bookmark:

`/portal/vendors/products/:productId/cost-centers`

Trang mới giữ nguyên quy trình thao tác hiện có: nhận diện sản phẩm, tìm kiếm cost center, phân trang, thêm, import và chỉnh sửa cost center.

## Route và quyền truy cập

- Thêm lazy route portal cho URL trên.
- Bảo vệ route bằng permission global `VENDORS:READ` hiện có.
- Bảng Products điều hướng tới route thay vì thiết lập state để mở Drawer.
- Có thao tác quay lại `/portal/vendors`; tab Products vẫn là điểm bắt đầu của luồng này.

## Thành phần trang

1. Header ngữ cảnh sản phẩm: thao tác quay lại, tên/mã sản phẩm, thông tin vendor và trạng thái.
2. Thanh công cụ cost center: tìm kiếm, **Add cost center** và **Import cost centers**. Các thao tác ghi dùng kiểm tra quyền Vendor dùng chung.
3. `CoreDataTable`: giữ các cột Code, Name, SKU, Base cost, Status và Actions; tiếp tục có cuộn ngang, phân trang và chọn số bản ghi mỗi trang dùng chung.
4. Form chỉnh sửa cost center hiện tại vẫn là Drawer trong phạm vi thay đổi này. Khi lưu, form sẽ invalidates query cost center của sản phẩm và danh sách Products cha.
5. Modal import CSV hiện tại chuyển theo trang mới, giữ validation, preview, feedback và cơ chế invalidation.

## Luồng dữ liệu

- Lấy `productId` từ params của React Router.
- Tải product bằng API adapter Vendor hiện có, sau đó query cost centers với state search, trang và số bản ghi/trang cục bộ cho route.
- Product không tồn tại/không hợp lệ hiển thị error state chuẩn thay vì một workspace rỗng.
- Query key tiếp tục dùng `vendorKeys`, nhờ đó thao tác editor/import refresh cả trang chi tiết và danh sách Products.

## Chuyển đổi luồng cũ

- Xóa state, query và phần render Drawer cost center khỏi `VendorWorkspacePage`.
- Ngừng dùng `VendorWorkspaceCostCenterDrawer`; hành vi bảng được chuyển vào trang chuyên biệt thay vì nhân bản.
- Giữ nguyên `VendorCostCenterEditorModal` ở giai đoạn này.

## Kiểm tra

- Test route/trang: render theo product ID, ngữ cảnh sản phẩm, phân trang và thao tác quay lại.
- Test tab Products: Manage cost centers điều hướng đến route mới.
- Các test editor/import hiện có vẫn hợp lệ; chạy focused test của Vendor, lint và production build.
