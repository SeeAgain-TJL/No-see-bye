# 不说再见 · No See Bye

一个记录生活、收藏回忆的小站。写下今天的心情，存下照片和视频，以后随时回来翻看。

支持多人注册，每个账号都有自己的记录空间。记录默认仅自己可见，也可以主动设为公开。

## 可以做什么

- **记录日常**：保存文字、照片和视频，添加日期、地点、心情和标签。
- **回看记忆**：通过卡片、时间线、照片墙浏览，用搜索和筛选找到某一天。
- **重温生活**：首页用可拖动的时光相册翻阅日常。手机为叠放照片，电脑为展开照片；点按当前照片可放大，明信片与回忆播放保留独立入口。
- **随手记一笔**：首页快速记录心情，未写完的文字会保存在当前浏览器。
- **管理记录**：编辑、收藏、删除和从回收站恢复；支持修改昵称和密码。

手机和电脑都能使用，提供四种主题。图片支持放大查看，上传失败可以重试。

## 本地启动

需要 **Node.js 24** 和 **npm**。

1. 安装依赖，并复制配置文件：

   ```bash
   npm ci
   cp .env.example .env
   ```

   Windows PowerShell 将第二行换成 `Copy-Item .env.example .env`。

2. 生成登录密钥：

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   打开 `.env`，把 `JWT_SECRET` 的值替换为刚才生成的内容。其他配置本地使用时可保持默认。

3. 初始化数据库并启动：

   ```bash
   npm run db:generate
   npm run db:init
   npm run dev
   ```

打开 <http://localhost:3000>，注册自己的账号即可使用，没有预设账号。

默认情况下，数据库和上传文件保存在 `data/`。已有数据时请保留原来的数据库路径，`db:init` 可以重复运行，不会清空记录。

## 部署到 Linux

按照 [Linux 部署说明](docs/deployment.md) 操作。发布包自带 Node.js，服务器上不需要另外安装 Node.js 或执行 `npm install`，服务由 systemd 管理。

上线时将 `APP_ORIGIN` 设置为实际访问的 HTTPS 域名。更新前先停止服务，备份并保留 **`data/` 和 `config.env`**；如果启用了附件清理定时任务，也要一起暂停。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run check` | 检查类型错误 |
| `npm run lint` | 检查代码规范 |
| `npm run build` | 构建正式版本 |
| `npm start` | 运行构建好的正式版本 |
| `npm run test:integration` | 运行集成测试，需先完成构建 |
| `npm run assets:cleanup` | 清理超过 24 小时且没有关联记录的附件 |

集成测试使用独立的测试数据库，不修改正式数据。附件清理不会自动清空回收站。

## 使用说明

- 单张图片最大 **20 MiB**，单个视频最大 **200 MiB**，每条记录最多 **12 个附件**。
- 草稿只保存文字，刷新后需要重新选择附件；视频建议使用 MP4/H.264 或 WebM。
- 公开记录后，访客也能查看其原始附件，请确认内容适合分享。
- 当前使用 SQLite 和本地文件存储，适合部署为单个应用实例；数据库、上传文件和密钥需要单独备份。

技术栈：Next.js、React、TypeScript、Prisma、SQLite。更多开发说明见 [模块设计](docs/memories-design.md)。
