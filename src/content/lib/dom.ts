import { uiMarker } from '../constants'

export function markUiElement(el: HTMLElement) {
  el.setAttribute(uiMarker, '')
  return el
}

export function generateSelector(el: Element | null): string {
  if (!el || el === document.body || el === document.documentElement)
    return 'body'
  if (el.id)
    return `#${CSS.escape(el.id)}`
  const path: string[] = []
  let current: Element | null = el
  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase()
    if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`)
      break
    }
    if (typeof (current as HTMLElement).className === 'string') {
      const classes = (current as HTMLElement).className.trim().split(/\s+/).filter(Boolean).slice(0, 2)
      if (classes.length)
        selector += `.${classes.map(c => CSS.escape(c)).join('.')}`
    }
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === current?.tagName)
      if (siblings.length > 1)
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`
    }
    path.unshift(selector)
    current = current.parentElement
  }
  return path.join(' > ')
}

export function isDocScrapeUiElement(el: Element | null) {
  return Boolean(el?.closest?.(`[${uiMarker}]`))
}
