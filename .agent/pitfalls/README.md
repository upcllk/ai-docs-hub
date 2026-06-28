# 坑与问题记录

记录实现过程中遇到的问题、踩过的坑，以及解决方案。
**Agent 在遇到新问题后必须在此追加记录。**

---

## 记录模板

```markdown
### [PITFALL-XXX] 问题标题

- **发现时间**：YYYY-MM-DD
- **涉及模块**：（如：Mermaid 渲染 / GitHub Actions / AnnotationProvider）
- **问题描述**：简述问题现象
- **根本原因**：分析为什么会出现
- **解决方案**：具体怎么解决的
- **预防措施**：后续如何避免
```

---

## 已记录问题

### [PITFALL-001] Mermaid 边标签中的数字前缀导致渲染错误

- **发现时间**：2026-06-28
- **涉及模块**：plan.md / Mermaid 图表渲染
- **问题描述**：Mermaid flowchart 的边标签中使用 `|1. 文字|` 格式，在飞书等渲染器中显示 "Unsupported markdown: list"
- **根本原因**：`1.` 被 Markdown 解析器识别为有序列表语法
- **解决方案**：删除边标签中的数字前缀，改为纯文字描述
- **预防措施**：Mermaid 边标签中避免使用 `N.`、`()`、`→` 等特殊符号，保持简洁纯文字

### [PITFALL-002] Markdown 中 `~~` 符号被解析为删除线

- **发现时间**：2026-06-28
- **涉及模块**：ui/SelectionCapture（viewer.ts 中的 showTooltip / openDialog）
- **问题描述**：浮动按钮和评论弹窗在页面未滚动时位置正常，滚动后出现在视口之外看不到
- **根本原因**：`getBoundingClientRect()` 返回的是相对于视口的坐标；`position: fixed` 元素的 `top/left` 也是相对于视口的，两者不需要再加 `window.scrollY`
- **解决方案**：去掉 `+ window.scrollY`，直接使用 `rect.top` 和 `rect.bottom`
- **预防措施**：使用 `position: fixed` 时坐标直接用 `getBoundingClientRect()`；使用 `position: absolute` 时才需要加 `scrollY`

- **发现时间**：2026-06-28
- **涉及模块**：plan.md / ASCII 示意图
- **问题描述**：在代码块内使用 `~~~~~~~~~~~~~~~~~~` 作为下划线装饰，被部分渲染器解析为空删除线
- **根本原因**：`~~text~~` 是 Markdown 删除线语法，`~~` 成对出现即可能触发
- **解决方案**：改用 `------------------` 替代
- **预防措施**：代码块内的装饰性字符使用 `-`、`=`、`_` 等安全符号

### [PITFALL-004] async init() 中断导致事件监听未绑定

- **发现时间**：2026-06-28
- **涉及模块**：viewer.ts / initSelectionCapture
- **问题描述**：选中文字无任何反应，控制台无 debug 日志
- **根本原因**：`init()` 中 `refreshAnnotations()` 抛错，导致后续的 `initSelectionCapture()` 从未执行，mouseup 事件从未绑定
- **解决方案**：将 `initSelectionCapture()` 提到 `refreshAnnotations()` 之前；或对 `refreshAnnotations()` 加 try-catch
- **预防措施**：事件绑定等"基础功能"不应依赖"数据加载"的成功，两者应并行或基础功能优先

### [PITFALL-005] Vite SPA fallback 对不存在文件返回 200 + HTML

- **发现时间**：2026-06-28
- **涉及模块**：LocalFileProvider.listAnnotations
- **问题描述**：`SyntaxError: Unexpected token '<'`，JSON 解析报错
- **根本原因**：Vite dev server 默认开启 SPA fallback，访问不存在的路径返回 `index.html`（status 200），而非 404；代码仅检查 status 404，未能拦截这种情况
- **解决方案**：额外检查响应的 `Content-Type`，非 JSON 类型时直接返回 `[]`
- **预防措施**：在 Vite 开发环境中 fetch 静态 JSON 文件时，不能仅靠 status code 判断，需结合 Content-Type 或在 `vite.config.ts` 中禁用 `historyApiFallback`

### [PITFALL-006] GitHub Issues API 标签过滤依赖标签预先存在

- **发现时间**：2026-06-28
- **涉及模块**：GitHubIssueUrlProvider.listAnnotations
- **问题描述**：提交 Issue 后刷新页面，标注不显示
- **根本原因**：API 按 `annotation,v1.0` 标签过滤，但仓库中这两个标签不存在；预填 URL 里设置的 labels 在标签不存在时会被 GitHub 静默忽略，Issue 没有打上任何标签，导致 API 返回空列表
- **解决方案**：改为按 Issue 标题前缀 `[annotation] {docId}@{version}` 筛选，无需标签
- **预防措施**：GitHub 预填 URL 的 labels 参数不可靠；涉及标签过滤时需先通过 API 确保标签存在
