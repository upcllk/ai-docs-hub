import { GitHubIssueUrlProvider } from './providers/GitHubIssueUrlProvider'

// 版本从 URL 路径 → URL 参数 → 环境变量 依次取，兼容本地开发和 GitHub Pages 部署
const pathVersion = location.pathname.match(/\/(v\d+\.\d+)\//)?.[1]
const queryVersion = new URLSearchParams(location.search).get('version') ?? undefined

export const githubOwner: string = import.meta.env.VITE_GITHUB_OWNER ?? 'upcllk'
export const githubRepo: string  = import.meta.env.VITE_GITHUB_REPO  ?? 'ai-docs-hub'
export const currentVersion: string = pathVersion ?? queryVersion ?? import.meta.env.VITE_DOC_VERSION ?? 'v1.0'

export const provider = new GitHubIssueUrlProvider({
  owner: githubOwner,
  repo:  githubRepo,
})

// 切换回 LocalFileProvider（离线场景）：
// import { LocalFileProvider } from './providers/LocalFileProvider'
// export const provider = new LocalFileProvider({ baseUrl: import.meta.env.BASE_URL ?? '/' })
