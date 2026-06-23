import { afterEach, describe, expect, it, vi } from 'vitest'
import { getFineGrainedTokenUrl, normalizeGitHubPath, normalizeGitHubRepository, publishMarkdownToGitHub } from '../../src/lib/github'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('github configuration normalization', () => {
  it('accepts owner/repo and GitHub repository URLs', () => {
    expect(normalizeGitHubRepository('openai/codex')).toBe('openai/codex')
    expect(normalizeGitHubRepository('https://github.com/openai/codex/')).toBe('openai/codex')
  })

  it('rejects invalid repository names and parent paths', () => {
    expect(() => normalizeGitHubRepository('codex')).toThrow('owner/repo')
    expect(() => normalizeGitHubPath('../private', 'page.md')).toThrow('无效')
  })

  it('normalizes repository paths', () => {
    expect(normalizeGitHubPath('/posts/', 'Hello World.md')).toBe('posts/Hello World.md')
  })

  it('creates a prefilled fine-grained token URL for the repository owner', () => {
    const url = new URL(getFineGrainedTokenUrl('https://github.com/acme/notes'))
    expect(url.pathname).toBe('/settings/personal-access-tokens/new')
    expect(url.searchParams.get('target_name')).toBe('acme')
    expect(url.searchParams.get('expires_in')).toBe('90')
    expect(url.searchParams.get('contents')).toBe('write')
  })
})

describe('publishMarkdownToGitHub', () => {
  it('creates a new UTF-8 markdown file when the path does not exist', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: { html_url: 'https://github.com/acme/notes/blob/main/posts/test.md' } }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await publishMarkdownToGitHub('# 中文', 'test.md', {
      token: 'token',
      repository: 'acme/notes',
      directory: 'posts',
      branch: 'main',
    })

    expect(result.path).toBe('posts/test.md')
    const request = fetchMock.mock.calls[1]
    const body = JSON.parse(request[1].body)
    expect(body.branch).toBe('main')
    expect(body.sha).toBeUndefined()
    expect(new TextDecoder().decode(Uint8Array.from(atob(body.content), char => char.charCodeAt(0)))).toBe('# 中文')
  })

  it('includes the existing SHA when updating a file', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'existing-sha' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: {} }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await publishMarkdownToGitHub('updated', 'test.md', {
      token: 'token',
      repository: 'acme/notes',
      directory: '',
      branch: '',
    }, true)

    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.sha).toBe('existing-sha')
  })

  it('requires confirmation before overwriting an existing file', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'existing-sha' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await publishMarkdownToGitHub('updated', 'test.md', {
      token: 'token',
      repository: 'acme/notes',
      directory: '',
      branch: '',
    })

    expect(result).toEqual({ path: 'test.md', requiresConfirmation: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates the initial commit without a branch when the repository is empty', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'This repository is empty.' }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: {} }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await publishMarkdownToGitHub('first post', 'test.md', {
      token: 'token',
      repository: 'acme/empty-notes',
      directory: 'posts',
      branch: 'main',
    })

    const body = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(body.branch).toBeUndefined()
    expect(body.sha).toBeUndefined()
  })
})
