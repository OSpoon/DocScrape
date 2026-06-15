import type { MessageListener } from '../types'
import { isFirefoxLike } from '../constants'

type RuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0]

export function sendRuntimeMessage(message: unknown): Promise<unknown> {
  if (isFirefoxLike)
    return browser.runtime.sendMessage(message) as Promise<unknown>
  else
    return chrome.runtime.sendMessage(message) as Promise<unknown>
}

export function addRuntimeMessageListener(listener: MessageListener) {
  if (isFirefoxLike)
    browser.runtime.onMessage.addListener(listener as RuntimeMessageListener)
  else
    chrome.runtime.onMessage.addListener(listener as RuntimeMessageListener)
}

export function removeRuntimeMessageListener(listener: MessageListener) {
  if (isFirefoxLike)
    browser.runtime.onMessage.removeListener(listener as RuntimeMessageListener)
  else
    chrome.runtime.onMessage.removeListener(listener as RuntimeMessageListener)
}
