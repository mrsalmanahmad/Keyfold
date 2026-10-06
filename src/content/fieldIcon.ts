import { SHARED_STYLES } from './styles'
import type { AutofillMatch } from '../lib/messages'

export interface FieldIconHandlers {
  getMatches: () => Promise<AutofillMatch[]>
  onPick: (match: AutofillMatch) => void
  /** Only passed for the password field's own icon — filling a username field with a generated password makes no sense. */
  onGenerate?: () => void
}

const ICON_SIZE = 20

export function attachFieldIcon(field: HTMLInputElement, handlers: FieldIconHandlers): () => void {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.zIndex = '2147483647'
  document.documentElement.appendChild(host)
  const shadow = host.attachShadow({ mode: 'open' })
  shadow.appendChild(styleElement())

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'kf-icon-button'
  button.textContent = 'K'
  button.setAttribute('aria-label', 'Keyfold autofill')
  shadow.appendChild(button)

  let dropdownHost: HTMLElement | null = null

  function closeDropdown() {
    dropdownHost?.remove()
    dropdownHost = null
    document.removeEventListener('click', closeDropdown)
  }

  function position() {
    const rect = field.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      host.style.display = 'none'
      return
    }
    host.style.display = 'flex'
    host.style.top = `${rect.top + (rect.height - ICON_SIZE) / 2}px`
    host.style.left = `${rect.right - ICON_SIZE - 6}px`
  }

  async function openDropdown() {
    closeDropdown()
    const matches = await handlers.getMatches()

    dropdownHost = document.createElement('div')
    document.documentElement.appendChild(dropdownHost)
    const dropShadow = dropdownHost.attachShadow({ mode: 'open' })
    dropShadow.appendChild(styleElement())

    const list = document.createElement('div')
    list.className = 'kf-dropdown'
    const fieldRect = field.getBoundingClientRect()
    list.style.top = `${fieldRect.bottom + 4}px`
    list.style.left = `${Math.max(8, fieldRect.right - 220)}px`

    if (handlers.onGenerate) {
      const generateItem = document.createElement('button')
      generateItem.type = 'button'
      generateItem.className = 'kf-dropdown-item'
      generateItem.textContent = 'Generate password'
      generateItem.addEventListener('click', () => {
        handlers.onGenerate?.()
        closeDropdown()
      })
      list.appendChild(generateItem)
    }

    if (matches.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'kf-dropdown-item'
      empty.textContent = 'No saved logins for this site'
      list.appendChild(empty)
    } else {
      for (const match of matches) {
        const item = document.createElement('button')
        item.type = 'button'
        item.className = 'kf-dropdown-item'

        const title = document.createElement('span')
        title.className = 'kf-dropdown-title'
        title.textContent = match.title

        const username = document.createElement('span')
        username.className = 'kf-dropdown-username'
        username.textContent = match.username

        item.append(title, username)
        item.addEventListener('click', () => {
          handlers.onPick(match)
          closeDropdown()
        })
        list.appendChild(item)
      }
    }

    dropShadow.appendChild(list)
    setTimeout(() => document.addEventListener('click', closeDropdown), 0)
  }

  button.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropdownHost) closeDropdown()
    else void openDropdown()
  })

  position()
  const reposition = () => position()
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)
  const resizeObserver = new ResizeObserver(reposition)
  resizeObserver.observe(field)

  return function detach() {
    window.removeEventListener('scroll', reposition, true)
    window.removeEventListener('resize', reposition)
    resizeObserver.disconnect()
    closeDropdown()
    host.remove()
  }
}

function styleElement(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = SHARED_STYLES
  return style
}
