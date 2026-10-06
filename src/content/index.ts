/**
 * Content script: finds login forms and renders the in-field icon / save prompt.
 * Never touches keys or Drive directly — only exchanges messages with the
 * background service worker. STATUS: placeholder, form detection lands in Phase 3.
 */

console.debug('[Keyfold] content script loaded')
