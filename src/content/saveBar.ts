import { SHARED_STYLES } from './styles'

export interface SaveBarHandlers {
  onSave: () => void
  onDismiss: () => void
}

export function showSaveBar(label: string, primaryLabel: string, handlers: SaveBarHandlers): () => void {
  const host = document.createElement('div')
  document.documentElement.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = SHARED_STYLES
  shadow.appendChild(style)

  const bar = document.createElement('div')
  bar.className = 'kf-save-bar'

  const text = document.createElement('span')
  text.textContent = label
  bar.appendChild(text)

  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.className = 'kf-save-primary'
  saveButton.textContent = primaryLabel
  saveButton.addEventListener('click', () => {
    handlers.onSave()
    host.remove()
  })
  bar.appendChild(saveButton)

  const dismissButton = document.createElement('button')
  dismissButton.type = 'button'
  dismissButton.className = 'kf-save-dismiss'
  dismissButton.textContent = 'Not now'
  dismissButton.addEventListener('click', () => {
    handlers.onDismiss()
    host.remove()
  })
  bar.appendChild(dismissButton)

  shadow.appendChild(bar)
  return () => host.remove()
}
