import type TurndownService from 'turndown'

export type RuntimeMessage
  = | { type: 'enable-selection' }
    | { type: 'convert-page' }
    | { type: 'download', content: string, filename: string }

export type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: { markdown?: string, filename?: string, error?: string }) => void,
) => true | void

export type UiState
  = | { mode: 'hidden' }
    | { mode: 'picking' }
    | { mode: 'selected', selector: string }

export interface SelectionState {
  selectionEnabled: boolean
  pointerListenersActive: boolean
  selectedElement: Element | null
  hoveredElement: Element | null
  highlight: HTMLDivElement | null
  turndown: TurndownService | null
  messageListener: MessageListener | null
}

export interface SelectionController {
  exitSelection: () => void
  resetSelectionForAnotherPick: () => void
  convertSelected: () => void
}
