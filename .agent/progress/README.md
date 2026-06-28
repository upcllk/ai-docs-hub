# 实现进度追踪

记录各模块的实现状态。**Agent 完成某模块后必须更新对应状态。**

状态说明：
- `⬜ 待开始` — 尚未启动
- `🟡 进行中` — 已部分实现
- `✅ 已完成` — 功能完整可用
- `❌ 已阻塞` — 遇到问题，暂停（需在 pitfalls 中记录原因）

---

## 整体进度

| 模块 | 状态 | 负责 Agent / Session | 备注 |
|------|------|---------------------|------|
| 技术方案规划（plan.md） | ✅ 已完成 | 初始 Session | 含平台选型、接口设计、版本隔离逻辑 |
| 技术设计文档（TECHNICAL_DESIGN.md） | ✅ 已完成 | 初始 Session | 含技术栈、模块划分、接口设计、调用关系 |
| 仓库基础结构 | ✅ 已完成 | 初始 Session | .gitignore、AGENTS.md、.agent/、package.json、tsconfig.json、vite.config.ts |
| .env.example 文件 | ✅ 已完成 | 初始 Session | 环境变量模板已创建 |
| 示例 PRD HTML 文档 | ✅ 已完成 | 初始 Session | docs/sample-prd.html，含标准 PRD 结构 |
| M1 · core/types.ts | ✅ 已完成 | 初始 Session | Anchor、Annotation、Reply、AnnotationMeta 类型定义 |
| M2 · core/AnnotationProvider.ts | ✅ 已完成 | 初始 Session | 可替换后端接口契约 |
| M3 · providers/LocalFileProvider.ts | ✅ 已完成（备用）| 初始 Session | 离线备用：fetch 静态 JSON + git 命令行写入 |
| M3b · providers/GitHubIssueUrlProvider.ts | ✅ 已完成 | 初始 Session | Demo 主力：跳转 GitHub 预填 Issue 页面，读取用公开 API |
| M4 · ui/SelectionCapture.ts | ⬜ 待开始 | — | Selection API，弹出评论输入框 |
| M5 · ui/Highlighter.ts | ⬜ 待开始 | — | 在原文渲染高亮标记 |
| M6 · ui/CommentDialog.ts | ⬜ 待开始 | — | 评论输入弹窗 |
| M7 · ui/AnnotationPanel.ts | ⬜ 待开始 | — | 侧边评论面板，双向联动高亮 |
| M8 · src/config.ts | ✅ 已完成 | 初始 Session | 当前注入 GitHubIssueUrlProvider，LocalFileProvider 保留为备用注释 |
| M9 · viewer/viewer.ts + index.html | ✅ 已完成 | 初始 Session | 入口，含文字选中、高亮渲染、评论面板、弹窗 |
| M10 · .github/workflows/deploy.yml | ⬜ 待开始 | — | Tag 推送 → 多版本 GitHub Pages 自动部署 |
| 版本隔离验证 | ⬜ 待开始 | — | v1.0 和 v1.1 标注互不影响 |

> **注**：`GitHubIssueProvider` 已从设计中移除，Demo 阶段统一使用 `LocalFileProvider`（git 命令行写入）。

---

## 里程碑

| 里程碑 | 目标 | 状态 |
|--------|------|------|
| M1：方案确定 | plan.md 定稿，目录结构搭建 | ✅ 完成 |
| M2：版本管理可用 | GitHub Pages + Tag 自动部署跑通 | ⬜ 待开始 |
| M3：标注核心可用 | 选中文字 → 创建 Issue → 渲染高亮 | ⬜ 待开始 |
| M4：完整 Demo | M2 + M3 联调，版本隔离验证通过 | ⬜ 待开始 |

---

## 变更日志

| 日期 | 变更内容 |
|------|---------|
| 2026-06-28 | 初始化仓库结构，完成技术方案规划，M1 里程碑达成 |
| 2026-06-28 | 完成详细技术设计文档（TECHNICAL_DESIGN.md）：技术栈、10个模块划分、调用关系、关键设计决策 |
| 2026-06-28 | 完成 M1~M3（types、AnnotationProvider 接口、LocalFileProvider）；新增示例 PRD、.env.example、项目基础配置 |
| 2026-06-28 | 实现 M8（config.ts）和 M9（viewer）：文字选中、高亮渲染、评论面板、弹窗一体化；更新 vite.config.ts 和 tsconfig.json |
---
