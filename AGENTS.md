<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 发布分支约定

- 一次完整上线使用一个分支，包含该次上线的功能、修复、部署调整及说明。
- 过程中按已完成内容多次提交，继续推送同一分支；不要按小修改或技术子任务额外拆分支。
- 合并通过 PR 完成；上线收尾后清理已合并的临时分支。
- 每次上线说明必须以之前线上版本为基线，写清本次优化、验证结果、部署状态及已知限制。
