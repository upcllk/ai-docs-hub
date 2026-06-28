import type { AnnotationProvider } from '../core/AnnotationProvider'
import type { Anchor, Annotation, AnnotationMeta } from '../core/types'

interface GitHubIssueUrlProviderConfig {
  owner: string
  repo: string
}

/**
 * 方式 A Provider：
 * - 写入：生成预填 GitHub Issue 创建 URL，由调用方打开（window.open / location.href）
 * - 读取：GitHub Issues 公开 REST API，无需 Token
 *
 * createAnnotation 不直接创建 Issue，而是返回一个特殊值（REDIRECT_URL:...），
 * 由 viewer.ts 识别后打开对应 URL。
 */
export const REDIRECT_PREFIX = 'REDIRECT_URL:'

export class GitHubIssueUrlProvider implements AnnotationProvider {
  private readonly owner: string
  private readonly repo: string
  private readonly apiBase = 'https://api.github.com'

  constructor(config: GitHubIssueUrlProviderConfig) {
    this.owner = config.owner
    this.repo  = config.repo
  }

  // ─── 写入：生成预填 Issue URL ──────────────────────────────────────────────

  async createAnnotation(anchor: Anchor, comment: string, meta: AnnotationMeta): Promise<string> {
    const title = `[annotation] ${anchor.docId}@${anchor.version}: ${anchor.selectedText.slice(0, 30)}`

    // Issue body 包含机器可读的锚点信息（隐藏在 HTML 注释中）
    const body = [
      `<!-- annotation-anchor`,
      JSON.stringify({ anchor, author: meta.author }),
      `-->`,
      ``,
      `**选中文字**`,
      `> ${anchor.selectedText}`,
      ``,
      `**评论**`,
      comment,
    ].join('\n')

    const url = new URL(`https://github.com/${this.owner}/${this.repo}/issues/new`)
    url.searchParams.set('title', title)
    url.searchParams.set('body', body)
    // labels 仅作为可选提示，不存在的标签会被 GitHub 忽略

    // 返回特殊前缀，viewer.ts 识别后打开该 URL
    return `${REDIRECT_PREFIX}${url.toString()}`
  }

  // ─── 读取：公开 API，无需 Token ────────────────────────────────────────────

  async listAnnotations(docId: string, version: string): Promise<Annotation[]> {
    const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/issues`
    const params = new URLSearchParams({
      state: 'open',
      per_page: '100',
    })

    const res = await fetch(`${url}?${params}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) {
      console.warn(`[GitHubIssueUrlProvider] Failed to list issues: ${res.status}`)
      return []
    }

    const issues = await res.json() as GitHubIssue[]
    const titlePrefix = `[annotation] ${docId}@${version}`

    return issues
      .filter(i => i.title.startsWith(titlePrefix))
      .map(issueToAnnotation)
      .filter((a): a is Annotation => a !== null)
  }

  async replyToAnnotation(_annotationId: string, _reply: string, _meta: AnnotationMeta): Promise<void> {
    throw new Error('GitHubIssueUrlProvider: 回复请直接在 GitHub Issue 页面操作')
  }

  async deleteAnnotation(_annotationId: string, _docId: string, _version: string): Promise<void> {
    throw new Error('GitHubIssueUrlProvider: 删除请直接在 GitHub Issue 页面操作')
  }
}

// ─── GitHub API 类型 ──────────────────────────────────────────────────────────

interface GitHubIssue {
  number: number
  title: string
  body: string | null
  user: { login: string } | null
  created_at: string
  comments: number
}

// ─── Issue → Annotation 转换 ──────────────────────────────────────────────────

function issueToAnnotation(issue: GitHubIssue): Annotation | null {
  const body = issue.body ?? ''

  // 提取机器可读的锚点信息
  const anchorMatch = body.match(/<!--\s*annotation-anchor\s*([\s\S]*?)\s*-->/)
  if (!anchorMatch) return null

  try {
    const data = JSON.parse(anchorMatch[1]) as { anchor: Anchor; author: string }
    const comment = extractComment(body)
    return {
      id: String(issue.number),
      anchor: data.anchor,
      comment,
      author: data.author || issue.user?.login || 'unknown',
      createdAt: issue.created_at,
      replies: [],
    }
  } catch {
    return null
  }
}

function extractComment(body: string): string {
  // 提取 "**评论**" 之后的内容
  const match = body.match(/\*\*评论\*\*\s*\n([\s\S]*)$/)
  return match ? match[1].trim() : body
}
