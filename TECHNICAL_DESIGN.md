# AI Docs Hub — 技术设计文档

> 本文档面向开发者和 AI Agent，描述系统的技术选型、模块划分及文件职责。
> 宏观背景和需求见 [`plan.md`](./plan.md)。

---

## 一、技术栈

| 层次 | 选型 | 理由 |
|------|------|------|
| 语言 | **TypeScript** | 为 `AnnotationProvider` 接口提供类型约束，跨模块调用更安全 |
| 构建工具 | **Vite** | 零配置开箱即用，构建产物为纯静态文件，直接托管到 GitHub Pages |
| 样式 | **原生 CSS（CSS Variables）** | 无额外依赖，主题色统一管理 |
| HTTP 调用 | **原生 Fetch API** | 无需引入 SDK，GitHub REST API 完全够用 |
| 运行时 | **浏览器（无后端）** | 读取 Issues 无需鉴权；写入通过前端持有的 PAT Token |
| CI/CD | **GitHub Actions** | Tag 推送触发自动部署到 GitHub Pages |

**不引入任何 UI 框架**（React / Vue 等），理由：文档查看器的 DOM 结构固定且简单，引入框架反而增加构建复杂度和产物体积。

---

## 二、目录结构

```
ai-docs-hub/
├── docs/                          # AI 生成的 PRD / 技术文档 (HTML)
│   └── sample-prd.html            # 示例文档
│
├── src/                           # 标注系统源码
│   ├── core/                      # 数据类型与核心接口（无 UI、无副作用）
│   │   ├── types.ts               # 所有 TS 类型定义
│   │   └── AnnotationProvider.ts  # AnnotationProvider 接口
│   │
│   ├── providers/                 # AnnotationProvider 的具体实现
│   │   ├── GitHubIssueProvider.ts # Demo 实现：GitHub Issues REST API
│   │   └── LocalFileProvider.ts   # 备用实现：本地 JSON 文件（离线场景）
│   │
│   ├── ui/                        # 纯 UI 组件（不依赖任何 Provider）
│   │   ├── SelectionCapture.ts    # 监听文字选中事件，提取锚点信息
│   │   ├── CommentDialog.ts       # 评论输入弹窗
│   │   ├── Highlighter.ts         # 在原文上渲染高亮标记
│   │   └── AnnotationPanel.ts     # 侧边评论面板
│   │
│   ├── viewer/                    # 文档查看器（入口，组装所有模块）
│   │   ├── index.html             # 查看器 HTML 外壳
│   │   └── viewer.ts              # 入口脚本，依赖注入 Provider
│   │
│   └── config.ts                  # 运行时配置（注入哪个 Provider、仓库信息等）
│
├── .github/
│   └── workflows/
│       └── deploy.yml             # Tag 推送 → 构建 → GitHub Pages 部署
│
├── .env.example                   # 环境变量模板（不含真实 Token）
├── vite.config.ts                 # Vite 构建配置
├── tsconfig.json
├── package.json
├── AGENTS.md
├── plan.md
└── TECHNICAL_DESIGN.md            # 当前文件
```

---

## 三、模块划分与构建顺序

模块按依赖顺序排列，编号即建议的实现顺序：

```
[M1] core/types.ts
      └─► [M2] core/AnnotationProvider.ts
                └─► [M3] providers/GitHubIssueProvider.ts
                └─► [M3] providers/LocalFileProvider.ts
      └─► [M4] ui/SelectionCapture.ts
      └─► [M5] ui/Highlighter.ts
      └─► [M6] ui/CommentDialog.ts
                └─► [M7] ui/AnnotationPanel.ts  (聚合 M5 + M6)
[M8] src/config.ts  (选择注入哪个 Provider)
[M9] viewer/viewer.ts  (组装 M2~M8，最终入口)
[M10] .github/workflows/deploy.yml  (独立，不依赖源码)
```

---

## 四、各模块详细设计

### M1 · `src/core/types.ts`

定义全局数据类型，**被所有模块引用，自身无任何依赖**。

```typescript
// 锚点：描述"选中的是哪段文字、在文档的哪个位置"
interface Anchor {
  docId: string        // 文档标识（对应 HTML 文件名，如 "sample-prd"）
  version: string      // 文档版本（对应 Git Tag，如 "v1.0"）
  selectedText: string // 用户选中的原始文本（用于渲染时匹配和高亮）
  contextBefore: string  // 选中文字前 50 个字符（辅助定位，防止重复文本冲突）
  contextAfter: string   // 选中文字后 50 个字符
}

// 一条标注（含锚点 + 评论内容 + 元数据）
interface Annotation {
  id: string           // Provider 返回的唯一 ID（对应 GitHub Issue number）
  anchor: Anchor
  comment: string      // 评论正文
  author: string       // 评论作者（GitHub username 或自定义）
  createdAt: string    // ISO 8601 时间戳
  replies: Reply[]     // 回复列表
}

interface Reply {
  id: string
  comment: string
  author: string
  createdAt: string
}

interface AnnotationMeta {
  author: string
}
```

**锚点定位策略**：用 `selectedText + contextBefore + contextAfter` 三元组定位，而非 XPath。原因：XPath 在文档结构轻微变更后即失效；文本匹配对 AI 重新生成的文档有更好的鲁棒性。

---

### M2 · `src/core/AnnotationProvider.ts`

定义可替换的后端接口，**不含任何实现逻辑**。

```typescript
interface AnnotationProvider {
  // 创建一条新标注，返回标注 ID
  createAnnotation(anchor: Anchor, comment: string, meta: AnnotationMeta): Promise<string>

  // 读取某文档某版本的所有标注
  listAnnotations(docId: string, version: string): Promise<Annotation[]>

  // 对某条标注追加回复
  replyToAnnotation(annotationId: string, reply: string, meta: AnnotationMeta): Promise<void>

  // 删除某条标注（软删除：关闭对应 Issue）
  deleteAnnotation(annotationId: string): Promise<void>
}
```

---

### M3 · `src/providers/LocalFileProvider.ts`（Demo 主力）

`AnnotationProvider` 的 Demo 实现，**标注数据存为仓库内的 JSON 文件，通过 git 命令提交**，零鉴权、零 API。

**文件存储路径约定：**

```
annotations/
  {docId}/
    {version}.json    ← 该文档该版本的所有标注
```

例：`annotations/sample-prd/v1.0.json`

**JSON 文件格式：**

```json
[
  {
    "id": "a1b2c3",
    "anchor": {
      "docId": "sample-prd",
      "version": "v1.0",
      "selectedText": "需要确认的文字",
      "contextBefore": "前50个字符...",
      "contextAfter": "后50个字符..."
    },
    "comment": "这里需要和产品确认",
    "author": "张三",
    "createdAt": "2026-06-28T10:00:00Z",
    "replies": []
  }
]
```

**关键方法说明：**

| 方法 | 操作 | 说明 |
|------|------|------|
| `createAnnotation` | 读取 JSON → 追加 → 写回文件 | ID 用 `Date.now()` 生成短串 |
| `listAnnotations` | `fetch annotations/{docId}/{version}.json` | GitHub Pages 托管后直接可读 |
| `replyToAnnotation` | 读取 JSON → 找到对应条目 → 追加 reply → 写回 | 同上 |
| `deleteAnnotation` | 读取 JSON → 过滤掉该 ID → 写回 | 硬删除 |

**写入后的工作流**（用户侧操作，前端提示执行）：

```bash
git add annotations/
git commit -m "添加标注：{selectedText 前 20 字}"
git push origin main
```

> **后期扩展**：`GitHubIssueProvider` 作为可替换实现，通过修改 `config.ts` 中的注入配置切换，无需改动业务代码。

---

### M4 · `src/ui/SelectionCapture.ts`

监听用户的文字选中行为，提取锚点信息，触发回调。

**职责**：
- 监听 `mouseup` / `touchend` 事件
- 检测 `window.getSelection()` 是否有非空选区
- 提取 `selectedText`、`contextBefore`、`contextAfter`（从 DOM 文本节点）
- 在选区末尾附近渲染一个浮动的「添加评论」按钮
- 用户点击按钮时，调用传入的 `onSelect(anchor)` 回调

**不做的事**：不调用 Provider，不渲染评论框——职责单一。

---

### M5 · `src/ui/Highlighter.ts`

负责在文档原文中渲染高亮标记。

**职责**：
- 接收 `Annotation[]`，遍历每条标注的锚点
- 用 `contextBefore + selectedText + contextAfter` 在 DOM 中定位文本节点
- 用 `<mark data-annotation-id="{id}">` 包裹选中文字，添加高亮样式
- 高亮点击时触发 `onHighlightClick(annotationId)` 回调（由 AnnotationPanel 监听）

**文本定位算法**（简化版）：
1. 遍历文档所有文本节点（`TreeWalker`）
2. 找到包含 `contextBefore + selectedText + contextAfter` 的节点
3. 用 `Range` API 精确包裹 `selectedText` 部分

---

### M6 · `src/ui/CommentDialog.ts`

评论输入弹窗，在用户完成文字选中后弹出。

**职责**：
- 接收锚点信息，渲染一个浮动输入框（紧靠选区位置）
- 包含：评论输入区、提交按钮、取消按钮
- 提交时调用 `onSubmit(anchor, commentText)` 回调
- 写入期间显示 loading 状态，完成后自动关闭

---

### M7 · `src/ui/AnnotationPanel.ts`

侧边评论面板，展示当前文档所有标注的评论线程。

**职责**：
- 接收 `Annotation[]`，渲染为侧边栏列表
- 每条标注显示：高亮原文引用、评论内容、作者、时间、回复列表
- 点击某条标注时，触发 `Highlighter` 滚动到对应高亮位置（双向联动）
- 点击 `Highlighter` 的高亮时，侧边栏对应条目滚动到视口（反向联动）
- 支持折叠/展开（宽屏展开，窄屏收起为悬浮按钮）

**与其他模块的联动**：

```
用户点击侧边栏条目
  → AnnotationPanel 触发 onAnnotationFocus(id)
  → viewer.ts 调用 Highlighter.scrollTo(id)

用户点击文档高亮
  → Highlighter 触发 onHighlightClick(id)
  → viewer.ts 调用 AnnotationPanel.scrollTo(id)
```

---

### M8 · `src/config.ts`

运行时配置，**唯一需要修改的地方**即可切换 Provider。

```typescript
// Demo 阶段：使用本地 JSON 文件 + git 命令行提交
import { LocalFileProvider } from './providers/LocalFileProvider'

export const provider = new LocalFileProvider({
  baseUrl: import.meta.env.BASE_URL,  // GitHub Pages 的仓库根路径
})

export const currentVersion = import.meta.env.VITE_DOC_VERSION ?? 'latest'

// 后期切换 GitHub Issues：只需替换上面两行为：
// import { GitHubIssueProvider } from './providers/GitHubIssueProvider'
// export const provider = new GitHubIssueProvider({ owner, repo, token })
```

---

### M9 · `src/viewer/viewer.ts` + `index.html`

**入口脚本**，组装所有模块，处理模块间事件传递。

`index.html` 结构：

```html
<body>
  <div id="doc-container">
    <!-- AI 生成的 PRD HTML 内容注入此处（fetch + innerHTML，或构建时内嵌） -->
  </div>
  <aside id="annotation-panel"></aside>
</body>
```

`viewer.ts` 启动流程：

```
1. 读取 URL 参数确定 docId 和 version
2. fetch 对应的 PRD HTML，注入 #doc-container
3. 调用 provider.listAnnotations(docId, version)
4. 调用 Highlighter.render(annotations)  → 渲染高亮
5. 调用 AnnotationPanel.render(annotations) → 渲染侧边栏
6. 初始化 SelectionCapture，onSelect → 打开 CommentDialog
7. CommentDialog.onSubmit → provider.createAnnotation() → 刷新步骤 3~5
```

---

### M10 · `.github/workflows/deploy.yml`

GitHub Actions 工作流，**独立于源码，无 TS 依赖**。

**触发条件**：推送符合 `v*.*` 格式的 Tag（如 `v1.0`）。

**执行步骤**：

```
1. checkout 代码
2. 设置 Node.js 环境
3. npm ci
4. npm run build（Vite 构建，产物输出到 dist/）
5. 将 dist/ 内容部署到 gh-pages 分支的 /{tag}/ 子目录
   （例：gh-pages/v1.0/、gh-pages/v2.3/）
6. 同时更新 gh-pages 根目录为最新 Tag 的内容（latest）
```

**版本 URL 结构**：

```
https://{owner}.github.io/{repo}/          ← 最新版本
https://{owner}.github.io/{repo}/v1.0/     ← v1.0 永久存档
https://{owner}.github.io/{repo}/v2.3/     ← v2.3 永久存档
```

构建时通过环境变量注入版本号：`VITE_DOC_VERSION=${{ github.ref_name }}`

---

## 五、模块调用关系总览

```
viewer.ts (M9)
  ├── config.ts (M8)
  │     └── GitHubIssueProvider (M3)
  │           └── AnnotationProvider interface (M2)
  │                 └── types.ts (M1)
  ├── SelectionCapture (M4)  ──── 触发 ──► CommentDialog (M6)
  │                                              │
  │                                     调用 provider.createAnnotation
  ├── Highlighter (M5)  ◄──────────────── 刷新数据
  └── AnnotationPanel (M7)
        ├── 内嵌 Highlighter 联动
        └── 内嵌 CommentDialog（回复功能）
```

---

## 六、关键设计决策说明

| 决策 | 选择 | 放弃的选项 | 原因 |
|------|------|-----------|------|
| 锚点定位 | 文本 + 上下文匹配 | XPath | XPath 在 AI 重新生成文档后几乎必然失效 |
| Issue 数据存储 | Body 内嵌 JSON 注释块 | 自建数据库 | 零运维，数据随仓库永久保留 |
| PRD 内容加载 | fetch + innerHTML 注入 | iframe | iframe 跨域限制多，iframe 内的文本选中锚点难以提取 |
| 版本目录 | gh-pages 分支多子目录 | 多分支 | 多分支方案 URL 不友好，子目录方案 URL 清晰 |
| Token 传递 | Vite 环境变量 | localStorage | 环境变量在构建时注入，不暴露于运行时 JS 全局作用域 |
