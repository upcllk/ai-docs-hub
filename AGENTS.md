# AGENTS.md — AI Agent 协作指南

本文件是所有 AI Agent（包括 GitHub Copilot、Claude 等）在操作此仓库时的**首要参考文档**。
每次 Agent 完成任务后，**必须检查并按需更新**本文件及 `.agent/` 目录下的相关文件。

---

## 项目概述

**ai-docs-hub** 是一个将 AI 生成的 PRD / 技术文档托管到 GitHub 的协作系统，核心解决：
1. 文档在线化与版本管理（Git Tags + GitHub Pages）
2. 文字选中行内评论（前端 Selection API + GitHub Issues 作为后端存储）

> 宏观方案见 [`plan.md`](./plan.md)，模块级技术设计见 [`TECHNICAL_DESIGN.md`](./TECHNICAL_DESIGN.md)

---

## 目录结构

```
ai-docs-hub/
├── AGENTS.md              ← 当前文件，Agent 操作指南
├── plan.md                ← 高层技术方案（架构、接口设计）
├── TECHNICAL_DESIGN.md    ← 详细技术设计（模块划分、文件职责、接口定义）
├── .gitignore
├── .agent/
│   ├── pitfalls/          ← 实现中遇到的坑和问题
│   │   └── README.md      ← 坑记录索引
│   ├── progress/          ← 实现进度追踪
│   │   └── README.md      ← 进度追踪索引
│   └── todos/             ← 已知缺陷与后续规划
│       └── README.md      ← 待办清单
├── .github/
│   └── workflows/         ← GitHub Actions 配置（待创建）
├── docs/                  ← PRD / 技术文档 HTML 文件（待创建）
└── src/                   ← 前端标注系统源码（待创建）
```

---

## Agent 行为规范

### 每次任务开始前
1. 阅读 `plan.md` 了解整体架构，阅读 `TECHNICAL_DESIGN.md` 了解模块划分与接口约定
2. 阅读 `.agent/progress/README.md` 了解当前实现进度
3. 阅读 `.agent/pitfalls/README.md` 避免踩已知的坑
4. 阅读 `.agent/todos/README.md` 了解当前已知缺陷与后续规划

### 每次任务完成后
必须执行以下检查，**有变化则更新，无变化可跳过**：

- [ ] `.agent/progress/README.md` — 更新已完成的模块状态
- [ ] `.agent/pitfalls/README.md` — 记录本次遇到的新问题
- [ ] `.agent/todos/README.md` — 新增待办项或更新已完成的待办状态
- [ ] `AGENTS.md` — 如目录结构或规范发生变化，同步更新本文件

### 提交规范
- Commit message 使用**中文**
- 不得将 `.env` 或任何含 Token / Secret 的文件提交到仓库
- 每个功能模块独立提交，避免大杂烩提交

---

## 核心接口约定

### AnnotationProvider 接口
所有评论后端实现必须遵循此接口，以支持运行时替换：

```typescript
interface AnnotationProvider {
  createAnnotation(anchor: Anchor, comment: string, meta: AnnotationMeta): Promise<string>
  listAnnotations(docId: string, version: string): Promise<Annotation[]>
  replyToAnnotation(annotationId: string, reply: string): Promise<void>
  deleteAnnotation(annotationId: string): Promise<void>
}
```

Demo 阶段实现：`GitHubIssueProvider`（PAT Token 存入 `.env`，**不提交**）

---

## 环境变量说明

| 变量名 | 用途 | 是否必须 |
|--------|------|---------|
| `GITHUB_TOKEN` | GitHub PAT（Issues Read & Write）| 写入标注时必须 |
| `GITHUB_OWNER` | 仓库所有者用户名 | 是 |
| `GITHUB_REPO` | 仓库名称 | 是 |

配置方式：复制 `.env.example`（待创建）为 `.env` 并填入值。

---

## 已知限制（Demo 阶段）

- 写入标注需要本地配置 `GITHUB_TOKEN`，不支持多用户同时写入
- 文字选中锚点基于文本匹配，文档内容变更后历史锚点可能失效
- 暂不支持离线场景
