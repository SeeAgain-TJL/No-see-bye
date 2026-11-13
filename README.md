# 不说再见 · No See Bye

可扩展的个人门户，第一项功能是多人使用的记忆手札。当前使用 **SQLite + 本地磁盘**，无需对象存储密钥。

## 本地启动

要求 Node.js 24 LTS 和 npm。只使用 npm 和 package-lock.json。

```bash
npm ci
cp .env.example .env
# PowerShell: Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# 将输出填入 .env 的 JWT_SECRET，不要提交密钥。
npm run db:generate
npm run db:init
npm run dev
```

访问 http://localhost:3000，自行注册账号。没有预设生产账号。DATABASE_URL 相对路径从 prisma/ 解析，STORAGE_LOCAL_DIR 相对路径从应用工作目录解析；示例把两者放在 data/。

初始化是可重复的增量升级，不清空旧记录。已有 prisma/dev.db 可以继续使用，不要用空的新路径替换旧库。本版采用 db:init 管理增量升级，不要对已有数据库执行 migrate reset 或带 accept-data-loss 的 db push。

## 当前功能

门户、多人注册登录、独立私密空间、图文视频记录、补记日期/地点/心情/标签、卡片/时间线、搜索与筛选、收藏、原文件预览、编辑冲突检测、回收站恢复、本地文字草稿。

单张图片上限 20 MiB，单个视频 200 MiB，一条最多 12 个附件；默认每人配额 2 GiB。记录默认私密；公开后任何访客可看原始附件。撤回公开或放入回收站后，后续媒体请求立即重新鉴权。登录使用 HttpOnly Cookie，文件不放在 public/。

## 检查与维护

```bash
npm run check
npm run lint
npm run build
npm run test:integration
npm run assets:cleanup
```

集成检查使用独立目录、数据库和端口 3101，结束自动清理，不写入正式数据库。检查前先完成生产构建。附件清理仅处理超过 24 小时且没有关联记录的文件，不清空回收站。

## 部署和边界

见 [ECS 部署说明](docs/deployment.md) 与 [模块设计](docs/memories-design.md)。也可初始化后 npm run build，再 npm start。Docker 配置已提供，本次尚未在 Linux Docker 实际构建；本机已运行 Node 生产构建。

当前仅 local 驱动；微信、找回密码、后台管理、永久删除、转码和断点续传尚未实现。草稿只保存文字，刷新后需重新选择附件。MOV 编码不一定被浏览器支持，优先 MP4/H.264 或 WebM。公开原图可能含 EXIF 位置等信息。

部署为单进程单实例。应用认证限流在内存中，Nginx 另加 IP 限流；ALLOW_REGISTRATION=false 可关闭注册。数据库、媒体和密钥单独备份，不进入 Git。
