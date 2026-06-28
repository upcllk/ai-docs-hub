import { provider, currentVersion } from '../config'
import type { Anchor, Annotation } from '../core/types'

// ── 常量 ──────────────────────────────────────────────────────────────────────
const DOC_ID = 'sample-prd'
const CONTEXT_LEN = 50

// ── DOM 引用 ──────────────────────────────────────────────────────────────────
const docContainer   = document.getElementById('doc-container')!
const annotationList = document.getElementById('annotation-list')!
const annotationCount = document.getElementById('annotation-count')!
const docTitle       = document.getElementById('doc-title')!
const versionBadge   = document.getElementById('version-badge')!
const tooltip        = document.getElementById('selection-tooltip')!
const dialog         = document.getElementById('comment-dialog')!
const dialogPreview  = document.getElementById('dialog-preview')!
const commentInput   = document.getElementById('comment-input') as HTMLTextAreaElement
const authorInput    = document.getElementById('comment-author') as HTMLInputElement
const cancelBtn      = document.getElementById('dialog-cancel')!
const submitBtn      = document.getElementById('dialog-submit') as HTMLButtonElement

// ── 状态 ─────────────────────────────────────────────────────────────────────
let annotations: Annotation[] = []
let pendingAnchor: Anchor | null = null

// ── 启动 ─────────────────────────────────────────────────────────────────────
async function init() {
  versionBadge.textContent = currentVersion

  // 1. 加载 PRD HTML
  await loadDoc()

  // 3. 先初始化文字选中监听（不依赖标注数据，不阻塞）
  initSelectionCapture()

  // 2. 加载已有标注并渲染（失败时降级为空，不影响选中功能）
  await refreshAnnotations()
}

// ── 加载文档 ──────────────────────────────────────────────────────────────────
async function loadDoc() {
  try {
    const base = import.meta.env.BASE_URL ?? '/'
    const url = `${base}docs/${DOC_ID}.html`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // 提取 <body> 内容注入（避免重复 <html><head> 标签）
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    docContainer.innerHTML = bodyMatch ? bodyMatch[1] : html

    // 更新顶部标题
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    docTitle.textContent = titleMatch ? titleMatch[1] : DOC_ID
  } catch (e) {
    docContainer.innerHTML = `<div style="padding:40px;color:#ef4444">文档加载失败：${e}</div>`
  }
}

// ── 加载并渲染标注 ─────────────────────────────────────────────────────────────
async function refreshAnnotations() {
  annotations = await provider.listAnnotations(DOC_ID, currentVersion)
  renderHighlights()
  renderPanel()
}

// ── 高亮渲染 ──────────────────────────────────────────────────────────────────
function renderHighlights() {
  // 清除已有 mark 标签（还原原始文本节点）
  docContainer.querySelectorAll('mark.annotation-highlight').forEach(mark => {
    const parent = mark.parentNode!
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    parent.normalize()
  })

  for (const ann of annotations) {
    highlightAnchor(ann)
  }
}

function highlightAnchor(ann: Annotation) {
  const { selectedText, contextBefore, contextAfter } = ann.anchor
  const searchStr = contextBefore + selectedText + contextAfter

  const walker = document.createTreeWalker(docContainer, NodeFilter.SHOW_TEXT)
  let node: Text | null

  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.nodeValue?.indexOf(searchStr) ?? -1
    if (idx === -1) continue

    const startOffset = idx + contextBefore.length
    const endOffset = startOffset + selectedText.length

    // 用 Range API 精确包裹选中文字
    const range = document.createRange()
    range.setStart(node, startOffset)
    range.setEnd(node, endOffset)

    const mark = document.createElement('mark')
    mark.className = 'annotation-highlight'
    mark.dataset.annotationId = ann.id
    mark.title = `${ann.author}：${ann.comment}`
    range.surroundContents(mark)

    mark.addEventListener('click', () => focusAnnotation(ann.id))
    break // 每条标注只高亮第一个匹配
  }
}

// ── 侧边面板渲染 ───────────────────────────────────────────────────────────────
function renderPanel() {
  annotationCount.textContent = String(annotations.length)

  if (annotations.length === 0) {
    annotationList.innerHTML = `
      <div class="panel-empty">
        <span class="icon">🖊️</span>
        <span>选中文档中的文字<br>即可添加评论</span>
      </div>`
    return
  }

  annotationList.innerHTML = annotations.map(ann => `
    <div class="annotation-item" data-id="${ann.id}">
      <div class="annotation-quote">${escapeHtml(ann.anchor.selectedText)}</div>
      <div class="annotation-comment">${escapeHtml(ann.comment)}</div>
      <div class="annotation-meta">${escapeHtml(ann.author)} · ${formatDate(ann.createdAt)}</div>
    </div>
  `).join('')

  annotationList.querySelectorAll('.annotation-item').forEach(el => {
    el.addEventListener('click', () => focusAnnotation((el as HTMLElement).dataset.id!))
  })
}

function focusAnnotation(id: string) {
  // 高亮侧边栏条目
  annotationList.querySelectorAll('.annotation-item').forEach(el => {
    el.classList.toggle('active', (el as HTMLElement).dataset.id === id)
  })
  // 滚动到文档高亮位置
  const mark = docContainer.querySelector(`mark[data-annotation-id="${id}"]`)
  if (mark) {
    mark.classList.add('active')
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => mark.classList.remove('active'), 1500)
  }
}

// ── 文字选中捕获 ───────────────────────────────────────────────────────────────
function initSelectionCapture() {
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('touchend', onMouseUp)
  document.addEventListener('mousedown', (e) => {
    if (!(e.target as Element).closest('#selection-tooltip') &&
        !(e.target as Element).closest('#comment-dialog')) {
      hideTooltip()
    }
  })

  tooltip.addEventListener('click', openDialog)
  cancelBtn.addEventListener('click', closeDialog)
  submitBtn.addEventListener('click', submitComment)
}

function onMouseUp(e: Event) {
  if ((e.target as Element).closest('#comment-dialog')) return

  setTimeout(() => {
    const sel = window.getSelection()
    console.log('[debug] mouseup, sel:', sel?.toString(), 'isCollapsed:', sel?.isCollapsed)
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
      hideTooltip()
      return
    }
    const range = sel.getRangeAt(0)
    const inDoc = docContainer.contains(range.commonAncestorContainer)
    console.log('[debug] inDocContainer:', inDoc, range.commonAncestorContainer)
    if (!inDoc) {
      hideTooltip()
      return
    }
    const rect = range.getBoundingClientRect()
    console.log('[debug] rect:', rect, 'showing tooltip at top:', rect.top - 40)
    showTooltip(rect)
    pendingAnchor = buildAnchor(sel, range)
  }, 10)
}

function buildAnchor(sel: Selection, _range: Range): Anchor {
  const selectedText = sel.toString().trim()

  // 提取上下文：从文档全文中找到选中文字的前后各 CONTEXT_LEN 个字符
  const fullText = docContainer.innerText
  const idx = fullText.indexOf(selectedText)
  const contextBefore = idx >= 0 ? fullText.slice(Math.max(0, idx - CONTEXT_LEN), idx) : ''
  const contextAfter  = idx >= 0 ? fullText.slice(idx + selectedText.length, idx + selectedText.length + CONTEXT_LEN) : ''

  return { docId: DOC_ID, version: currentVersion, selectedText, contextBefore, contextAfter }
}

function showTooltip(rect: DOMRect) {
  tooltip.style.display = 'block'
  tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`
  tooltip.style.top  = `${rect.top - 40}px`
}

function hideTooltip() {
  tooltip.style.display = 'none'
}

// ── 评论弹窗 ───────────────────────────────────────────────────────────────────
function openDialog() {
  if (!pendingAnchor) return
  hideTooltip()
  dialogPreview.textContent = pendingAnchor.selectedText
  commentInput.value = ''
  authorInput.value = localStorage.getItem('annotation-author') ?? ''

  // 弹窗显示在选区附近
  const sel = window.getSelection()
  if (sel && !sel.isCollapsed) {
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    dialog.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`
    dialog.style.top  = `${rect.bottom + 8}px`
  }
  dialog.style.display = 'block'
  commentInput.focus()
}

function closeDialog() {
  dialog.style.display = 'none'
  pendingAnchor = null
  window.getSelection()?.removeAllRanges()
}

async function submitComment() {
  if (!pendingAnchor) return
  const comment = commentInput.value.trim()
  const author  = authorInput.value.trim() || '匿名'
  if (!comment) { commentInput.focus(); return }

  submitBtn.disabled = true
  submitBtn.textContent = '提交中...'
  localStorage.setItem('annotation-author', author)

  try {
    await provider.createAnnotation(pendingAnchor, comment, { author })
    closeDialog()
    await refreshAnnotations()
  } catch (e) {
    alert(`提交失败：${e}`)
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = '提交'
  }
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── 启动 ─────────────────────────────────────────────────────────────────────
init()
