import { Download, Github, MousePointer2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getConfig } from '../lib/config'
import { sendTabMessageWithRetry } from '../lib/tabs'

type TabInfo = { id: number, title: string, url: string } | null
const iconUrl = browser.runtime.getURL('icons/icon.png')

function Popup() {
  const [tab, setTab] = useState<TabInfo>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'downloaded' | 'confirming' | 'published' | 'error'>('idle')
  const [githubConfigured, setGithubConfigured] = useState(false)
  const hasTab = Boolean(tab)

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const t = tabs[0]
      if (t?.id !== undefined)
        setTab({ id: t.id, title: t.title || '', url: t.url || '' })
    })
    getConfig().then(config => setGithubConfigured(Boolean(config.githubToken.trim() && config.githubRepository.trim())))
  }, [])

  async function sendToTab(message: unknown, retries = 12) {
    if (!tab)
      return Promise.reject(new Error('No active tab'))
    return sendTabMessageWithRetry(tab.id, message, retries)
  }

  async function startSelection() {
    if (!hasTab)
      return
    setStatus('idle')
    try {
      await sendToTab({ type: 'enable-selection' })
      window.close()
    }
    catch {
      setStatus('error')
    }
  }

  async function getPageMarkdown() {
    return sendToTab({ type: 'convert-page' }) as Promise<{
      markdown?: string
      filename?: string
      packageImages?: boolean
      mediaDirectory?: string
      imageConcurrency?: number
      error?: string
    }>
  }

  async function convertPage() {
    if (!tab || saving)
      return
    setSaving(true)
    setStatus('idle')
    try {
      const resp = await getPageMarkdown()
      if (resp?.markdown) {
        await browser.runtime.sendMessage({
          type: 'download',
          content: resp.markdown,
          filename: resp.filename || 'page.md',
          packageImages: resp.packageImages,
          mediaDirectory: resp.mediaDirectory,
          imageConcurrency: resp.imageConcurrency,
        })
        setStatus('downloaded')
        setTimeout(() => window.close(), 800)
      }
      else {
        setStatus('error')
      }
    }
    catch {
      setStatus('error')
    }
    finally {
      setSaving(false)
    }
  }

  async function publishPage() {
    if (!tab || saving || !githubConfigured)
      return
    setSaving(true)
    const overwrite = status === 'confirming'
    if (!overwrite)
      setStatus('idle')
    try {
      const resp = await getPageMarkdown()
      if (!resp?.markdown)
        throw new Error(resp?.error || '页面转换失败')
      const result = await browser.runtime.sendMessage({
        type: 'publish-github',
        content: resp.markdown,
        filename: resp.filename || 'page.md',
        overwrite,
      }) as { error?: string, requiresConfirmation?: boolean }
      if (result?.error)
        throw new Error(result.error)
      if (result?.requiresConfirmation) {
        setStatus('confirming')
        return
      }
      setStatus('published')
    }
    catch {
      setStatus('error')
    }
    finally {
      setSaving(false)
    }
  }

  function openOptions() {
    browser.runtime.openOptionsPage()
    window.close()
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="popup-brand">
          <img className="popup-icon" src={iconUrl} alt="" aria-hidden="true" />
          <div>
            <h1>DocScrape</h1>
            <span>任意网页转 Markdown</span>
          </div>
        </div>
        <button className="popup-settings" type="button" onClick={openOptions} aria-label="打开设置">
          设置
        </button>
      </header>

      <section className="popup-page" aria-label="当前页面">
        <span className="popup-page-label">当前页面</span>
        <p className="popup-page-title" title={tab?.url || ''}>
          {tab?.title || '无法读取当前标签页'}
        </p>
      </section>

      <div className="popup-actions">
        <button
          className="popup-btn popup-btn-primary"
          type="button"
          onClick={startSelection}
          disabled={!hasTab}
        >
          <MousePointer2 className="popup-btn-icon" aria-hidden="true" />
          <span className="popup-btn-title">选取</span>
        </button>
        <button
          className="popup-btn popup-btn-secondary"
          type="button"
          onClick={convertPage}
          disabled={!hasTab || saving}
        >
          <Download className="popup-btn-icon" aria-hidden="true" />
          <span className="popup-btn-title">
            {saving ? '处理中' : status === 'downloaded' ? '已保存' : '下载'}
          </span>
        </button>
        <button
          className={`popup-btn popup-btn-github${status === 'confirming' ? ' popup-btn-warning' : ''}`}
          type="button"
          onClick={publishPage}
          disabled={!hasTab || saving || !githubConfigured}
        >
          <Github className="popup-btn-icon" aria-hidden="true" />
          <span className="popup-btn-title">{status === 'confirming' ? '确认覆盖' : status === 'published' ? '已发布' : 'GitHub'}</span>
        </button>
      </div>

      {status !== 'idle' && (
        <p className={`popup-status popup-status-${status}`}>
          {status === 'downloaded'
            ? 'Markdown 文件已保存。'
            : status === 'confirming'
              ? '同名文件已存在，再次点击 GitHub 按钮确认覆盖。'
              : status === 'published' ? 'Markdown 已发布到 GitHub。' : '操作失败，请检查页面或 GitHub 配置。'}
        </p>
      )}
    </div>
  )
}

const root = document.getElementById('root')
if (root)
  createRoot(root).render(<Popup />)
