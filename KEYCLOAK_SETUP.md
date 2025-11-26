# Hướng dẫn Keycloak SSO & OAuth2.0 cho Organica

Tài liệu này giúp bạn từ con số 0 triển khai Keycloak thay thế hệ thống JWT tự viết.

## Tóm tắt lợi ích
- Single Sign-On (SSO) cho nhiều ứng dụng.
- Quản lý user, vai trò (roles), nhóm, chính sách bảo mật tập trung.
- Hỗ trợ OAuth2/OIDC chuẩn: code flow, PKCE, refresh token, social IdP.
- Có giao diện quản trị trực quan.

## 1. Chạy Keycloak cục bộ bằng Docker
PowerShell:
```powershell
docker run -d --name keycloak -p 8080:8080 `
  -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin `
  quay.io/keycloak/keycloak:23.0 start-dev
```
Giao diện quản trị: http://localhost:8080

Đăng nhập với admin / admin (đổi ngay sau khi thiết lập xong!).

## 2. Tạo Realm
1. Vào Admin Console.
2. Menu bên trái: Click tên realm hiện tại -> Add realm.
3. Nhập tên: **organica** -> Create.

## 3. Tạo Client cho backend (Confidential)
1. Realm organica -> Clients -> Create client.
2. Client ID: **organica-backend**.
3. Client type: OpenID Connect.
4. Chọn Client authentication (confidential).
5. Root URL để trống hoặc đặt `http://localhost:3000/`.
6. Valid Redirect URIs: `http://localhost:3000/*`
7. Save.
8. Tab Credentials: copy **Client Secret** -> thêm vào `.env`.

## 4. Tạo Roles
Realm Roles -> Add role:
- `user`
- `admin`

## 5. Tạo User test và admin
Users -> Add user:
- Username: testuser
- Email: testuser@example.com
- Save -> Credentials tab -> Set password (turn OFF temporary).
- Role Mappings -> Add role `user`.

Tạo user admin tương tự và add role `admin`.

## 6. Biến môi trường `.env`
```dotenv
KEYCLOAK_BASE_URL=http://localhost:8080/
KEYCLOAK_REALM=organica
KEYCLOAK_CLIENT_ID=organica-backend
KEYCLOAK_CLIENT_SECRET=<secret-tu-keycloak>
```
Restart server Node (`npm start`). Console sẽ log: `Keycloak middleware enabled`.

## 7. Tích hợp với Organica
File `server.js` đã:
- Khởi tạo Keycloak nếu biến môi trường tồn tại.
- Map token Keycloak vào `req.user` (id, roles).
- Bảo vệ endpoint `/api/admin/health` bằng role `admin` qua `keycloak.protect('realm:admin')`.
- Giữ các endpoint JWT cũ như LEGACY để chuyển đổi dần.

## 8. Kiểm tra đăng nhập & vai trò
1. Mở trình duyệt: truy cập trực tiếp `http://localhost:3000/api/admin/health`.
2. Chưa đăng nhập sẽ thấy redirect tới trang login Keycloak.
3. Đăng nhập bằng user `admin` -> quay lại endpoint trả JSON `{ ok: true, users: ... }`.
4. Đăng nhập bằng user thường (role user) -> 403 Forbidden.

## 9. URL Login thủ công
Muốn nút đăng nhập trỏ thẳng tới Keycloak:
```
{KEYCLOAK_BASE_URL}realms/{KEYCLOAK_REALM}/protocol/openid-connect/auth?client_id={KEYCLOAK_CLIENT_ID}&response_type=code&scope=openid%20email%20profile&redirect_uri=http://localhost:3000/
```
Sau đăng nhập sẽ trả về `?code=` tới redirect URI.
Adapter Keycloak sẽ dùng code đó nếu bạn gọi route protect; nếu cần phân tích code thủ công cho SPA tách rời → dùng public client + PKCE.

## 10. Frontend helper
Đã thêm script `assets/js/keycloak-helper.js` tự động:
- Gọi `/api/me`.
- Nếu 401: đổi link icon login về trang Keycloak.
- Nếu 200: hiển thị tên người dùng.

Thêm vào cuối mỗi trang HTML:
```html
<script src="./assets/js/keycloak-helper.js"></script>
```
(Đã gắn ở `index.html`, sao chép cho các trang khác nếu cần.)

## 11. Chuyển đổi từ JWT cũ
- Giữ refresh tokens cũ thêm một thời gian; không cấp mới cho user sau khi đã có Keycloak.
- Dần dỡ bỏ các endpoint `/api/auth/*`.

## 12. Bảo mật nâng cao
- Đổi admin password mặc định.
- Dùng reverse proxy HTTPS (Nginx / Caddy) trước Keycloak và Node.
- Giới hạn CORS cho domain front-end chính.
- Bật tính năng email verification của Keycloak nếu cần.

## 13. Nâng cấp kế tiếp
- Thêm public client + PKCE để lấy access token dùng trực tiếp với fetch (nếu front-end tách domain).
- Tích hợp social login (Google, GitHub) ngay trong Keycloak: Identity Providers -> Add provider.
- Viết migration để đồng bộ user legacy vào Keycloak (sử dụng Admin REST API).

## 14. Gỡ Keycloak
Nếu muốn quay lại JWT legacy: xoá biến KEYCLOAK_* khỏi `.env` và restart server.

---
**Hoàn tất**: Bạn đã có SSO Keycloak chạy với Organica.
