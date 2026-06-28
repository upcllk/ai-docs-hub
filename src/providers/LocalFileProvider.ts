import type { AnnotationProvider } from '../core/AnnotationProvider'
import type { Anchor, Annotation, AnnotationMeta, Reply } from '../core/types'

interface LocalFileProviderConfig {
  /**
   * 标注 JSON 文件的 base URL。
   * 开发时为 Vite dev server 根路径；生产时为 GitHub Pages 的仓库根路径。
   * 例：`https://owner.github.io/ai-docs-hub/`
   */
  baseUrl: string
}

/**
 * Demo 阶段的 AnnotationProvider 实现。
 *
 * - 读取：fetch `{baseUrl}/annotations/{docId}/{version}.json`
 * - 写入：直接操作本地文件系统（仅在本地开发时有效），
 *         修改后由用户执行 `git add annotations/ && git commit && git push`
 *
 * 写入方法在浏览器环境中会抛出 NotSupportedError，
 * 调用方（viewer.ts）负责捕获并提示用户手动编辑文件后提交。
 */
export class LocalFileProvider implements AnnotationProvider {
  private readonly baseUrl: string

  constructor(config: LocalFileProviderConfig) {
    // 确保 baseUrl 末尾有斜杠
    this.baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl : config.baseUrl + '/'
  }

  // ─── 读取 ───────────────────────────────────────────────────────────────────

  async listAnnotations(docId: string, version: string): Promise<Annotation[]> {
    const url = `${this.baseUrl}annotations/${docId}/${version}.json`
    const res = await fetch(url)
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`Failed to fetch annotations: ${res.status} ${url}`)
    // Vite dev server SPA fallback 会对不存在的文件返回 index.html（status 200）
    // 通过 Content-Type 检测来避免把 HTML 误当 JSON 解析
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      return []
    }
    return res.json() as Promise<Annotation[]>
  }

  // ─── 写入（本地开发专用） ────────────────────────────────────────────────────

  async createAnnotation(anchor: Anchor, comment: string, meta: AnnotationMeta): Promise<string> {
    const annotations = await this.listAnnotations(anchor.docId, anchor.version)
    const newAnnotation: Annotation = {
      id: generateId(),
      anchor,
      comment,
      author: meta.author,
      createdAt: new Date().toISOString(),
      replies: [],
    }
    annotations.push(newAnnotation)
    await this.writeAnnotations(anchor.docId, anchor.version, annotations)
    return newAnnotation.id
  }

  async replyToAnnotation(_annotationId: string, _reply: string, _meta: AnnotationMeta): Promise<void> {
    // replyToAnnotation 需要知道 docId 和 version，从现有标注中查找
    throw new Error(
      'LocalFileProvider.replyToAnnotation: 请直接编辑对应的 annotations JSON 文件后执行 git commit'
    )
  }

  async deleteAnnotation(annotationId: string, docId: string, version: string): Promise<void> {
    const annotations = await this.listAnnotations(docId, version)
    const filtered = annotations.filter((a) => a.id !== annotationId)
    await this.writeAnnotations(docId, version, filtered)
  }

  // ─── 内部工具 ────────────────────────────────────────────────────────────────

  /**
   * 将标注数组序列化并写入本地文件。
   * 浏览器环境中使用 File System Access API（需用户授权）；
   * 如果不支持，则触发下载，由用户手动替换文件后提交。
   */
  private async writeAnnotations(docId: string, version: string, annotations: Annotation[]): Promise<void> {
    const content = JSON.stringify(annotations, null, 2)
    const filePath = `annotations/${docId}/${version}.json`

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      // File System Access API（Chrome 86+）
      const fileHandle = await (window as unknown as FileSystemAccessWindow).showSaveFilePicker({
        suggestedName: `${version}.json`,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
    } else {
      // 降级：触发文件下载，提示用户手动放置到正确路径
      triggerDownload(content, filePath.split('/').pop() ?? `${version}.json`)
      console.info(
        `[LocalFileProvider] 请将下载的文件放到仓库的 ${filePath}，然后执行：\n` +
        `  git add ${filePath}\n` +
        `  git commit -m "更新标注：${docId}@${version}"\n` +
        `  git push origin main`
      )
    }
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// File System Access API 的最小类型声明
interface FileSystemAccessWindow {
  showSaveFilePicker(options?: {
    suggestedName?: string
    types?: Array<{ description: string; accept: Record<string, string[]> }>
  }): Promise<{
    createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>
  }>
}

// ─── 辅助类型：给 Reply 补充 id（用于 replyToAnnotation 扩展时） ────────────────
export type { Reply }
