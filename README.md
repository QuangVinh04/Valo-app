# Valo App Backend

Backend API cho Valo App, xây dựng bằng Express, TypeScript, Prisma, PostgreSQL, Redis và Flowise AI provider.

## Tính năng chính

- Xác thực người dùng bằng JWT access token và refresh token.
- Quản lý người dùng, hồ sơ cá nhân và thiết lập giao diện/ngôn ngữ.
- Quản lý nhóm, quyền và thành viên nhóm.
- Quản lý hội thoại và tin nhắn chat.
- Stream phản hồi AI qua Flowise.
- Gửi email mật khẩu tạm thời bằng SMTP.
- Swagger UI tại `/api-docs`.

## Công nghệ

- Node.js + TypeScript
- Express 5
- Prisma ORM
- PostgreSQL
- Redis
- Nodemailer
- Flowise API
- Zod validation
- Docker Compose

## Cấu trúc thư mục

```text
src/
  config/          Cấu hình env, Prisma, Redis, mail, Swagger
  constants/       Mã lỗi, quyền, model AI
  controllers/     Nhận request và trả response
  database/        Kết nối DB, transaction, seeder
  mapper/          Chuyển entity sang DTO
  middlewares/     Auth, authorize, validate, logger, error handler
  repositories/    Truy vấn dữ liệu
  routes/          Định nghĩa endpoint
  services/        Business logic
  types/           DTO và schema validate
  utils/           Helper dùng chung
prisma/
  schema.prisma    Schema database
  migrations/      Lịch sử migration
```

## Yêu cầu môi trường

- Node.js 20+ khuyến nghị
- PostgreSQL
- Redis
- SMTP account để gửi email
- Flowise API key nếu dùng tính năng AI

## Cài đặt local

1. Cài dependencies:

```bash
npm install
```

2. Tạo file `.env` từ mẫu và cập nhật giá trị phù hợp:

```bash
cp .env.example .env
```

Các biến môi trường quan trọng theo code hiện tại:

```env
PORT=4001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
LOG_LEVEL=debug

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/valo_db?schema=public
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_jwt_secret_key
JWT_VALID_DURATION=15m
JWT_REFRESH_DURATION=30d

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=no-reply@example.com

AI_PROVIDER=flowise
FLOWISE_API_KEY=your_flowise_api_key
FLOWISE_BASE_URL=https://aiplatform.bkav.ai
FLOWISE_CHATFLOW_ID=fa6e3226-dc90-4c85-b7da-fbe275d198ba
```

3. Generate Prisma client và chạy migration:

```bash
npm run db:generate
npm run db:migrate
```

4. Chạy server development:

```bash
npm run dev
```

Server mặc định chạy tại `http://localhost:4001`.

## Chạy bằng Docker

Tạo file `.env.docker` từ `.env.docker.example`, sau đó chạy:

```bash
docker compose up --build
```

Docker Compose sẽ khởi động app, PostgreSQL, Redis và pgAdmin.

## Scripts

- `npm run dev`: chạy server bằng `tsx watch`.
- `npm run build`: build TypeScript ra thư mục `dist`.
- `npm start`: chạy bản build từ `dist/server.js`.
- `npm run typecheck`: kiểm tra type không emit file.
- `npm run lint`: chạy ESLint.
- `npm run lint:fix`: tự sửa lỗi lint có thể sửa.
- `npm run format`: format code bằng Prettier.
- `npm run db:generate`: generate Prisma client.
- `npm run db:migrate`: chạy migration development.

## API chính

Base path của API là `/api/v1`.

- `POST /auth/register`: đăng ký tài khoản.
- `POST /auth/login`: đăng nhập.
- `POST /auth/logout`: đăng xuất.
- `POST /auth/refresh-token`: cấp access token mới.
- `POST /auth/change-password`: đổi mật khẩu.
- `GET /users`: danh sách người dùng.
- `GET /users/me`: thông tin người dùng hiện tại.
- `PUT /users/settings`: cập nhật thiết lập cá nhân.
- `PUT /users/profile`: cập nhật hồ sơ cá nhân.
- `GET /groups`: danh sách nhóm.
- `POST /groups`: tạo nhóm.
- `POST /groups/:id/users`: thêm thành viên vào nhóm.
- `DELETE /groups/:id/users`: xóa thành viên khỏi nhóm.
- `GET /conversations`: danh sách hội thoại.
- `POST /conversations`: tạo hội thoại.
- `POST /messages`: gửi tin nhắn và stream phản hồi AI.
- `POST /messages/conversations/:id`: gửi tin nhắn vào hội thoại có sẵn.

Tài liệu Swagger có thể xem tại:

```text
http://localhost:4001/api-docs
```

## Database seed

Khi server khởi động, `src/server.ts` gọi seeder để tạo dữ liệu nền như nhóm quyền và tài khoản admin nếu chưa có.

## Ghi chú phát triển

- Business logic nằm trong `src/services`.
- Repository chỉ nên xử lý truy vấn dữ liệu.
- Controller chỉ nên nhận request, gọi service và trả response.
- Các lỗi nghiệp vụ nên dùng `AppError` với `ErrorCode`.
- Khi cần nhiều thao tác DB phụ thuộc nhau, dùng `withTransaction`.
