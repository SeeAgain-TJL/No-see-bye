# No-See-Bye (不说再见)

一个支持多用户的私人生活记录网站。记录日常的文字、照片、视频，媒体文件直传火山引擎 TOS 对象存储，网页作为轻量入口和时间线展示。

## 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (开发) / PostgreSQL (生产推荐)
- **对象存储**: 火山引擎 TOS (兼容 S3)
- **鉴权**: JWT
- **ORM**: Prisma

## 核心特性（MVP）

- ✅ 用户注册/登录（邮箱+密码）
- ✅ 发布日记（文字 + 图片/视频）
- ✅ 图片直传 TOS（预签名 URL）
- ✅ 视频分片上传（支持断点续传）
- ✅ 时间线展示（按时间倒序）
- ✅ 私有/公开可见性
- ✅ 单条日记详情页

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
# 数据库（开发用 SQLite 即可）
DATABASE_URL="file:./dev.db"

# JWT 密钥（生产环境务必改成随机字符串）
JWT_SECRET="your-random-secret-here"

# 火山引擎 TOS 配置
TOS_ACCESS_KEY_ID="你的AccessKey"
TOS_ACCESS_KEY_SECRET="你的SecretKey"
TOS_REGION="cn-beijing"
TOS_ENDPOINT="tos-cn-beijing.volces.com"
TOS_BUCKET="你的桶名"

# 应用地址
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**获取火山引擎 TOS 密钥**：
1. 登录[火山引擎控制台](https://console.volcengine.com/)
2. 进入「对象存储 TOS」服务，创建一个桶（建议设为私有）
3. 在「访问控制」→「密钥管理」创建 AccessKey/SecretKey
4. 记录桶名和 region/endpoint 信息

### 3. 初始化数据库

```bash
# Prisma 7 版本（稳定）
npx prisma generate
npx prisma db push

# 如果用的是 Prisma 8（当前依赖版本），参考下方说明
```

**Prisma 8 用户**：需要在 `prisma.config.ts` 里配置 ORM 部分，然后运行 `npx prisma db init`。详见 [Prisma 8 文档](https://www.prisma.io/docs/)。

### 4. 运行开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 项目结构

```
no-see-bye/
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── src/
│   ├── app/
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 注册/登录
│   │   │   ├── entries/       # 日记 CRUD
│   │   │   └── upload/        # TOS 上传签名
│   │   ├── auth/              # 登录/注册页面（TODO）
│   │   ├── page.tsx           # 首页（时间线，TODO）
│   │   └── layout.tsx
│   ├── components/            # React 组件（TODO）
│   └── lib/
│       ├── auth.ts            # JWT 鉴权工具
│       ├── prisma.ts          # Prisma 客户端
│       └── tos.ts             # TOS 存储适配层
├── .env.example
├── package.json
└── README.md
```

## API 文档

### 认证

#### POST /api/auth/register
注册新用户。

**请求体**：
```json
{
  "email": "user@example.com",
  "username": "myusername",
  "password": "your-password"
}
```

**响应**：
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "myusername"
  }
}
```

#### POST /api/auth/login
用户登录。

**请求体**：
```json
{
  "emailOrUsername": "user@example.com",
  "password": "your-password"
}
```

**响应**同上。

### 上传（需要 Authorization: Bearer <token>）

#### POST /api/upload/sign
获取图片直传签名 URL（<15MB）。

**请求体**：
```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 1024000
}
```

**响应**：
```json
{
  "uploadUrl": "https://...",
  "objectKey": "users/{userId}/2026/11/uuid.jpg"
}
```

前端拿到 `uploadUrl` 后，用 `PUT` 方法直接上传文件字节到这个 URL（不需要额外鉴权）。

#### POST /api/upload/multipart/init
初始化视频分片上传。

**请求体**：
```json
{
  "filename": "video.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 50000000
}
```

**响应**：
```json
{
  "uploadId": "multipart-upload-id",
  "objectKey": "users/{userId}/2026/11/uuid.mp4"
}
```

#### POST /api/upload/multipart/part-url
获取单个分片的预签名 URL。

**请求体**：
```json
{
  "objectKey": "users/.../uuid.mp4",
  "uploadId": "multipart-upload-id",
  "partNumber": 1
}
```

**响应**：
```json
{
  "partUrl": "https://..."
}
```

前端用 `PUT` 上传该分片，服务器返回 `ETag` header，记录下来。

#### POST /api/upload/multipart/complete
完成分片上传，合并分片。

**请求体**：
```json
{
  "objectKey": "users/.../uuid.mp4",
  "uploadId": "multipart-upload-id",
  "parts": [
    { "partNumber": 1, "eTag": "etag-from-response" },
    { "partNumber": 2, "eTag": "etag-from-response" }
  ]
}
```

**响应**：
```json
{
  "success": true,
  "objectKey": "users/.../uuid.mp4"
}
```

#### POST /api/upload/multipart/abort
取消分片上传（清理已上传的分片）。

**请求体**：
```json
{
  "objectKey": "users/.../uuid.mp4",
  "uploadId": "multipart-upload-id"
}
```

### 日记条目

#### GET /api/entries?cursor=...&limit=20
获取当前用户的日记列表，按时间倒序。

**响应**：
```json
{
  "entries": [
    {
      "id": "entry-id",
      "textContent": "今天天气不错...",
      "createdAt": "2026-11-12T10:00:00Z",
      "updatedAt": "2026-11-12T10:00:00Z",
      "media": [
        {
          "objectKey": "users/.../uuid.jpg",
          "url": "https://tos-signed-url..."
        }
      ]
    }
  ],
  "nextCursor": "cursor-for-next-page"
}
```

`url` 是已签名的 GET URL（1 小时有效期）。

#### POST /api/entries
创建新日记。

**请求体**：
```json
{
  "textContent": "今天的记录...",
  "mediaUrls": ["users/.../uuid.jpg", "users/.../uuid2.jpg"]
}
```

`mediaUrls` 是上传成功后得到的 `objectKey` 数组。

**响应**：
```json
{
  "id": "new-entry-id"
}
```

#### GET /api/entries/[id]
获取单条日记详情。

**响应**同列表项格式。

#### DELETE /api/entries/[id]
删除日记（同时删除 TOS 上的媒体文件）。

**响应**：
```json
{
  "success": true
}
```

## 部署

### 生产环境建议

1. **数据库**：切换到 PostgreSQL（修改 `DATABASE_URL`）
2. **JWT_SECRET**：设置一个足够随机的字符串
3. **TOS CDN**：给 TOS 桶绑定火山引擎 CDN 加速国内访问
4. **HTTPS**：部署到支持 HTTPS 的平台（Vercel / 自建服务器 + Nginx）
5. **环境变量**：所有敏感信息（密钥、token）用环境变量管理，不要提交到 Git

### 部署选项

- **Vercel**：`vercel deploy`（数据库和 TOS 配置需要在环境变量里设置）
- **火山引擎云服务器**：部署 Next.js 到 ECS，配合火山 RDS（PostgreSQL）和 TOS，网络延迟最低
- **Docker**：项目包含 Dockerfile（TODO）

## 后续计划

- [ ] 前端 UI 实现（登录/注册页、时间线、发布组件、详情页）
- [ ] 标签功能
- [ ] 搜索和筛选
- [ ] 好友关系与分享
- [ ] 视频封面自动生成
- [ ] PWA 支持
- [ ] 移动端优化

## License

MIT
