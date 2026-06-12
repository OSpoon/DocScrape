import type { SelectionState } from '../types'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

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

export function createMarkdownPayload(state: SelectionState, html: string) {
  return {
    markdown: getTurndown(state).turndown(html),
    filename: getPageFilename(),
  }
}
