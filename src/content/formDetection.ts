export interface DetectedLoginField {
  passwordField: HTMLInputElement
  usernameField: HTMLInputElement | null
}

const USERNAME_LIKE_TYPES = new Set(['text', 'email', 'tel'])

export function detectLoginFields(root: ParentNode = document): DetectedLoginField[] {
  const passwordFields = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="password"]'))
  return passwordFields.filter(isVisible).map((passwordField) => ({
    passwordField,
    usernameField: findUsernameField(passwordField),
  }))
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && el.offsetParent !== null
}

/**
 * Walks backwards from the password field, within its form (or the whole document if it
 * isn't inside one), for the nearest text-like input — a reasonable heuristic for where a
 * username/email field usually sits, without needing a full form-structure parser.
 */
function findUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
  const scope: ParentNode = passwordField.form ?? document
  const candidates = Array.from(scope.querySelectorAll<HTMLInputElement>('input'))
  const passwordIndex = candidates.indexOf(passwordField)

  for (let i = passwordIndex - 1; i >= 0; i--) {
    const candidate = candidates[i]
    if (isUsernameLike(candidate)) return candidate
  }
  return null
}

function isUsernameLike(input: HTMLInputElement): boolean {
  if (input.disabled || !isVisible(input)) return false
  return USERNAME_LIKE_TYPES.has(input.type)
}

/**
 * Sets a field's value the way a framework like React will actually notice — writing
 * `.value` directly doesn't fire React's synthetic change handling, since React patches
 * the setter on the element instance itself. Calling the native prototype setter first,
 * then dispatching real events, is the standard workaround.
 */
export function setFieldValue(field: HTMLInputElement, value: string): void {
  const prototypeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  prototypeSetter?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
  field.dispatchEvent(new Event('change', { bubbles: true }))
}
