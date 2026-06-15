import type { SelectionState } from '../types'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { uiMarker } from '../constants'

function getTurndown(state: SelectionState) {
  if (!state.turndown) {
    state.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      bulletListMarker: '-',
    })
    state.turndown.use(gfm)
  }
  return state.turndown
}

function sanitizeFilename(title: string) {
  return title
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 80) || 'page'
}

function getPageFilename() {
  return `${sanitizeFilename(document.title || 'untitled')}.md`
}

function shouldSkipUrl(value: string) {
  return /^(?:data|blob|javascript|mailto|tel):/i.test(value.trim())
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  const trimmed = value.trim()
  if (!trimmed || shouldSkipUrl(trimmed))
    return value
  try {
    return new URL(trimmed, baseUrl).href
  }
  catch {
    return value
  }
}

function normalizeSrcset(value: string, baseUrl: string) {
  return value
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/)
      const url = parts.shift()
      if (!url)
        return ''
      return [toAbsoluteUrl(url, baseUrl), ...parts].join(' ')
    })
    .filter(Boolean)
    .join(', ')
}

function normalizeAttributeUrls(root: ParentNode, baseUrl: string) {
  const urlAttributes = ['href', 'src', 'poster', 'cite', 'action']
  for (const attr of urlAttributes) {
    for (const el of root.querySelectorAll(`[${attr}]`)) {
      const value = el.getAttribute(attr)
      if (value)
        el.setAttribute(attr, toAbsoluteUrl(value, baseUrl))
    }
  }

  for (const el of root.querySelectorAll('[srcset]')) {
    const value = el.getAttribute('srcset')
    if (value)
      el.setAttribute('srcset', normalizeSrcset(value, baseUrl))
  }
}

function removeNonContentNodes(root: ParentNode) {
  for (const el of root.querySelectorAll(`script, style, noscript, template, [${uiMarker}], [data-extension-root="true"]`))
    el.remove()
}

function normalizeHtmlForMarkdown(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  const baseUrl = document.baseURI || window.location.href
  removeNonContentNodes(template.content)
  normalizeAttributeUrls(template.content, baseUrl)
  return template.innerHTML.trim()
}

export function createMarkdownPayload(state: SelectionState, html: string) {
  return {
    markdown: getTurndown(state).turndown(normalizeHtmlForMarkdown(html)),
    filename: getPageFilename(),
  }
}
