import { GitHubIssueUrlProvider } from './providers/GitHubIssueUrlProvider'

export const provider = new GitHubIssueUrlProvider({
  owner: import.meta.env.VITE_GITHUB_OWNER ?? 'upcllk',
  repo:  import.meta.env.VITE_GITHUB_REPO  ?? 'ai-docs-hub',
})

export const currentVersion: string = import.meta.env.VITE_DOC_VERSION ?? 'v1.0'

// 切换回 LocalFileProvider（离线场景）：
// import { LocalFileProvider } from './providers/LocalFileProvider'
// export const provider = new LocalFileProvider({ baseUrl: import.meta.env.BASE_URL ?? '/' })
