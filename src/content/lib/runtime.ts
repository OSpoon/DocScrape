import type { MessageListener } from '../types'
import { isFirefoxLike } from '../constants'

type RuntimeMessageListener = Parameters<typeof browser.runtime.onMessage.addListener>[0]

export function sendRuntimeMessage(message: unknown) {
  if (isFirefoxLike)
    browser.runtime.sendMessage(message)
  else
    chrome.runtime.sendMessage(message)
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
