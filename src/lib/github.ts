export interface GitHubPublishOptions {
  token: string
  repository: string
  directory: string
  branch: string
}

export function getFineGrainedTokenUrl(repository: string) {
  const normalized = repository.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^\/+|\/+$/g, '')
  const owner = normalized.split('/')[0]
  const params = new URLSearchParams({
    name: 'DocScrape',
    description: 'Publish Markdown from DocScrape',
    expires_in: '90',
    contents: 'write',
  })
  if (/^[\w.-]+$/.test(owner))
    params.set('target_name', owner)
  return `https://github.com/settings/personal-access-tokens/new?${params}`
}

interface GitHubContentResponse {
  sha?: string
  html_url?: string
  content?: { html_url?: string }
}

class GitHubApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

export function normalizeGitHubRepository(repository: string) {
  const normalized = repository.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^\/+|\/+$/g, '')
  if (!/^[\w.-]+\/[\w.-]+$/.test(normalized))
    throw new Error('GitHub 仓库格式应为 owner/repo')
  return normalized
}

export function normalizeGitHubPath(directory: string, filename: string) {
  const parts = `${directory}/${filename}`
    .replace(/\\/g, '/')
    .split('/')
    .map(part => part.trim())
    .filter(part => part && part !== '.')

  if (!parts.length || parts.includes('..'))
    throw new Error('GitHub 目录或文件名无效')
  return parts.join('/')
}

function encodeGitHubPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize)
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  return btoa(binary)
}

async function githubRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string }
    throw new GitHubApiError(body.message || `GitHub API 请求失败（${response.status}）`, response.status)
  }
  return response.json() as Promise<T>
}

function getContentsUrl(repository: string, path: string, branch: string) {
  const url = `https://api.github.com/repos/${repository}/contents/${encodeGitHubPath(path)}`
  return branch ? `${url}?ref=${encodeURIComponent(branch)}` : url
}

export async function testGitHubConnection(options: GitHubPublishOptions) {
  const repository = normalizeGitHubRepository(options.repository)
  await githubRequest(`https://api.github.com/repos/${repository}`, options.token.trim())
}

export async function publishMarkdownToGitHub(
  content: string,
  filename: string,
  options: GitHubPublishOptions,
  overwrite = false,
) {
  const token = options.token.trim()
  if (!token)
    throw new Error('请先配置 GitHub Token')

  const repository = normalizeGitHubRepository(options.repository)
  const path = normalizeGitHubPath(options.directory, filename)
  const branch = options.branch.trim()
  const contentsUrl = getContentsUrl(repository, path, branch)
  let existingSha: string | undefined
  let emptyRepository = false

  try {
    const existing = await githubRequest<GitHubContentResponse>(contentsUrl, token)
    existingSha = existing.sha
  }
  catch (error) {
    const missingFile = error instanceof GitHubApiError && error.status === 404
    emptyRepository = error instanceof GitHubApiError
      && error.status === 409
      && /repository is empty/i.test(error.message)
    if (!missingFile && !emptyRepository)
      throw error
  }

  if (existingSha && !overwrite)
    return { path, requiresConfirmation: true as const }

  const body: Record<string, string> = {
    message: `${existingSha ? 'Update' : 'Add'} ${path}`,
    content: encodeUtf8Base64(content),
  }
  // An empty repository has no branch yet; omitting it lets GitHub create the initial branch.
  if (branch && !emptyRepository)
    body.branch = branch
  if (existingSha)
    body.sha = existingSha

  const result = await githubRequest<GitHubContentResponse>(
    `https://api.github.com/repos/${repository}/contents/${encodeGitHubPath(path)}`,
    token,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  return {
    path,
    requiresConfirmation: false as const,
    url: result.content?.html_url || result.html_url || `https://github.com/${repository}/blob/${branch || 'HEAD'}/${path}`,
  }
}
