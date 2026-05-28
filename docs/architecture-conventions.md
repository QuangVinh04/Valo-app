# Architecture Conventions (Hybrid OOP + Functional)

## 1) Muc tieu
Tai lieu nay quy dinh cach to chuc code backend Node.js/Express theo mo hinh hybrid:
- OOP (class) cho thanh phan can quan ly dependency va business orchestration.
- Functional cho thanh phan stateless, pipeline-style.

Muc tieu la de scale, de test, de onboarding, va tranh over-engineering.

## 2) Nguyen tac tong quat
- Tach theo domain truoc, sau do theo layer trong tung domain.
- Controller mong (thin controller), khong viet business logic trong controller.
- Service la noi dieu phoi use case.
- Repository chi truy cap du lieu, khong chua business rule.
- Middleware xu ly cross-cutting (auth, logging, validation, error handling).

## 3) Khi nao dung class
Ap dung `class` cho cac thanh phan sau:
- `services/*`
- `repositories/*`
- `integrations/adapters/*`

Ly do:
- Can dependency injection (Prisma, Redis, API clients).
- Can mock de unit test.
- Co hanh vi nghiep vu theo use case.

Quy uoc:
- Constructor nhan dependency qua tham so.
- Method public mo ta use case ro rang.
- Khong truy cap truc tiep `req/res` trong service/repository.

## 4) Khi nao dung function
Ap dung function cho:
- `middlewares/*`
- `validators/*`
- `utils/*`
- `mappers/*`
- `policies/*` (neu chi la pure rules)

Ly do:
- Ngan gon, de doc, de compose.
- Phu hop pipeline cua Express.

## 5) Cau truc thu muc de xuat
```
src/
  modules/
    auth/
      auth.routes.ts
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.types.ts
    chat/
      chat.routes.ts
      chat.controller.ts
      chat.service.ts
      chat.repository.ts
    conversation/
      conversation.routes.ts
      conversation.controller.ts
      conversation.service.ts
      conversation.repository.ts
  middlewares/
    AuthMiddleware.ts
    ErrorHandler.ts
    RequestLogger.ts
  config/
    env.ts
    prisma.ts
    redis.ts
  utils/
    jwt.ts
    AppError.ts
    ApiResponse.ts
    logger.ts
```

## 6) Dependency Injection
- Khoi tao dependency tai `routes` composition root.
- Route tao repository -> service -> controller.
- Khong tao Prisma client moi trong tung service/repository.

Pattern:
- `const repo = new XRepository(prismaClient)`
- `const service = new XService(repo, otherDeps)`
- `const controller = new XController(service)`

## 7) Error handling
- Dung `AppError` cho loi nghiep vu (4xx).
- Loi he thong de global error handler bat (5xx).
- Middleware khong `res.json` truc tiep neu da co global formatter; uu tien `next(error)`.

## 8) Auth & Authorization
- `authenticate` middleware: verify JWT, gan `req.user`.
- Authorization (RBAC) tach rieng middleware/policy:
  - `requirePermission('CONV_R')`
  - `enforceConversationOwnership(userId, conversationId)`

## 9) Dat ten va style
- File: `kebab-case` hoac `PascalCase` nhat quan theo nhom hien tai.
- Class: `PascalCase` (`AuthService`).
- Function/variable: `camelCase`.
- Interface/type DTO ro nghia: `LoginRequestDto`, `AuthResponseDto`.

## 10) Test strategy
- Unit test:
  - Service (mock repository/integration).
  - Policy/validator (pure function).
- Integration test:
  - Route + middleware + DB test.
- Muc tieu:
  - Bao phu luong auth, permission, ownership, va chat streaming.

## 11) Anti-pattern can tranh
- Nhiet tinh class hoa tat ca (kể ca util va middleware don gian).
- Business logic nam trong controller.
- Repository chua validate rule nghiep vu.
- Circular dependencies giua modules.

## 12) Quy tac ra quyet dinh nhanh
- Co state/dependency va can mock? -> class.
- Stateless, 1 nhiem vu nho, de compose? -> function.
- Chua chac? Bat dau bang function, chi nang cap class khi can mo rong.
