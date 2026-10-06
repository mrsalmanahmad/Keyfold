import type { KeyfoldMessage, KeyfoldResponse } from './messages'

export function sendMessage<T = unknown>(message: KeyfoldMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: KeyfoldResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (response?.ok) resolve(response.data as T)
      else reject(new Error(response?.error ?? 'Unknown error'))
    })
  })
}
