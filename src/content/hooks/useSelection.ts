import type { RuntimeMessage, SelectionController, SelectionState, UiState } from '../types'
import { useEffect, useRef, useState } from 'react'
import { generateSelector, isDocScrapeUiElement, markUiElement } from '../lib/dom'
import { createMarkdownPayload } from '../lib/markdown'
import { addRuntimeMessageListener, removeRuntimeMessageListener, sendRuntimeMessage } from '../lib/runtime'

export function useSelection() {
  const [ui, setUi] = useState<UiState>({ mode: 'hidden' })
  const uiModeRef = useRef(ui.mode)
  const controllerRef = useRef<SelectionController | null>(null)
  const stateRef = useRef<SelectionState>({
    selectionEnabled: false,
    pointerListenersActive: false,
    selectedElement: null,
    hoveredElement: null,
    highlight: null,
    turndown: null,
    messageListener: null,
  })

  uiModeRef.current = ui.mode

  useEffect(() => {
    const state = stateRef.current
    const errorTimeoutIds: ReturnType<typeof setTimeout>[] = []

    function createHighlightOverlay() {
      if (state.highlight)
        return
      const el = markUiElement(document.createElement('div')) as HTMLDivElement
      el.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;display:none;'
      document.body.appendChild(el)
      state.highlight = el
    }

    function updateHighlight(el: Element, isSelected: boolean) {
      const hl = state.highlight
      if (!hl)
        return
      const rect = el.getBoundingClientRect()
      const border = isSelected ? '2px solid #2563eb' : '2px dashed #2563eb'
      const shadow = isSelected
        ? '0 0 0 1px rgba(255,255,255,0.9) inset,0 0 0 4px rgba(37,99,235,0.12)'
        : '0 0 0 1px rgba(255,255,255,0.88) inset'
      hl.style.cssText
        = `position:fixed;pointer-events:none;z-index:2147483646;`
          + `top:${rect.top}px;left:${rect.left}px;`
          + `width:${rect.width}px;height:${rect.height}px;`
          + `border:${border};border-radius:8px;box-sizing:border-box;`
          + `box-shadow:${shadow};background:rgba(37,99,235,0.05);display:block;`
    }

    function hideHighlight() {
      if (state.highlight)
        state.highlight.style.display = 'none'
    }

    function showError(message: string) {
      const msg = markUiElement(document.createElement('div'))
      msg.style.cssText
        = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);'
          + 'z-index:2147483647;background:#991b1b;color:#fff;'
          + 'padding:10px 16px;border-radius:999px;'
          + 'font:700 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;'
          + 'box-shadow:0 18px 42px rgba(127,29,29,0.25);'
      msg.textContent = `Error: ${message}`
      document.body.appendChild(msg)
      const timeoutId = setTimeout(() => msg.remove(), 4000)
      errorTimeoutIds.push(timeoutId)
    }

    function clearSelectionState() {
      state.selectedElement = null
      state.hoveredElement = null
    }

    function showPickingState() {
      clearSelectionState()
      createHighlightOverlay()
      hideHighlight()
      setUi({ mode: 'picking' })
      document.body.style.cursor = 'crosshair'
    }

    function exitSelection() {
      state.selectionEnabled = false
      state.pointerListenersActive = false
      clearSelectionState()
      document.body.style.cursor = ''
      hideHighlight()
      setUi({ mode: 'hidden' })
    }

    function resetSelectionForAnotherPick() {
      if (!state.selectionEnabled)
        return
      showPickingState()
      state.pointerListenersActive = true
    }

    function doConvert(el: Element) {
      exitSelection()
      try {
        const { markdown, filename } = createMarkdownPayload(state, el.outerHTML)
        sendRuntimeMessage({ type: 'download', content: markdown, filename })
      }
      catch (e) {
        showError(e instanceof Error ? e.message : String(e))
      }
    }

    function convertSelected() {
      if (state.selectedElement)
        doConvert(state.selectedElement)
    }

    function enableSelection() {
      if (state.selectionEnabled)
        return
      state.selectionEnabled = true
      state.pointerListenersActive = true
      showPickingState()
    }

    function handleMouseMove(e: MouseEvent) {
      if (!state.selectionEnabled || !state.pointerListenersActive)
        return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || isDocScrapeUiElement(el))
        return
      if (el !== state.hoveredElement) {
        state.hoveredElement = el
        updateHighlight(el, false)
      }
    }

    function handleScroll() {
      if (!state.selectionEnabled || !state.pointerListenersActive || !state.hoveredElement)
        return
      updateHighlight(state.hoveredElement, false)
    }

    function handleClick(e: MouseEvent) {
      if (!state.selectionEnabled || !state.pointerListenersActive)
        return
      const el = e.target instanceof Element ? e.target : null
      if (!el || isDocScrapeUiElement(el))
        return
      e.preventDefault()
      e.stopPropagation()
      state.selectedElement = el
      updateHighlight(el, true)
      state.pointerListenersActive = false
      setUi({ mode: 'selected', selector: generateSelector(el) })
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape')
        return
      if (uiModeRef.current === 'selected')
        resetSelectionForAnotherPick()
      else if (state.selectionEnabled)
        exitSelection()
    }

    controllerRef.current = {
      exitSelection,
      resetSelectionForAnotherPick,
      convertSelected,
    }

    state.messageListener = (message, sender, sendResponse) => {
      const msg = message as RuntimeMessage
      if (msg.type === 'enable-selection') {
        enableSelection()
      }
      else if (msg.type === 'convert-page') {
        try {
          const { markdown, filename } = createMarkdownPayload(state, document.body.innerHTML)
          sendResponse({ markdown, filename })
        }
        catch (e) {
          sendResponse({ error: e instanceof Error ? e.message : String(e) })
        }
        return true
      }
    }

    createHighlightOverlay()
    addRuntimeMessageListener(state.messageListener)

    document.addEventListener('mousemove', handleMouseMove, true)
    window.addEventListener('scroll', handleScroll, true)
    document.addEventListener('click', handleClick, true)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      controllerRef.current = null
      document.removeEventListener('mousemove', handleMouseMove, true)
      window.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      for (const timeoutId of errorTimeoutIds)
        clearTimeout(timeoutId)
      state.selectionEnabled = false
      state.pointerListenersActive = false
      clearSelectionState()
      document.body.style.cursor = ''
      hideHighlight()
      setUi({ mode: 'hidden' })
      if (state.highlight) {
        state.highlight.remove()
        state.highlight = null
      }
      if (state.messageListener) {
        removeRuntimeMessageListener(state.messageListener)
        state.messageListener = null
      }
    }
  }, [])

  return { ui, controllerRef }
}
