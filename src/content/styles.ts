/**
 * Plain CSS injected into each shadow root — not Tailwind. Shadow DOM already isolates us
 * from the host page's styles (and it from ours), so there's nothing for a utility-class
 * build step to scan here; keeping it hand-written avoids wiring Tailwind into a context
 * it can't help with anyway.
 */
export const SHARED_STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 13px; }

  .kf-icon-button {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: #171717;
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 11px;
  }
  .kf-icon-button:hover { background: #2f2f2f; }

  .kf-dropdown {
    position: fixed;
    min-width: 200px;
    max-width: 280px;
    background: white;
    border: 1px solid #d4d4d4;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    overflow: hidden;
    z-index: 2147483647;
  }
  .kf-dropdown-item {
    all: unset;
    display: block;
    width: 100%;
    padding: 8px 12px;
    cursor: pointer;
    color: #171717;
  }
  .kf-dropdown-item:hover { background: #f5f5f5; }
  .kf-dropdown-title { font-weight: 600; display: block; }
  .kf-dropdown-username { color: #737373; display: block; font-size: 12px; }

  .kf-save-bar {
    position: fixed;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: white;
    border: 1px solid #d4d4d4;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    color: #171717;
    z-index: 2147483647;
  }
  .kf-save-bar button {
    all: unset;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    font-weight: 600;
  }
  .kf-save-bar .kf-save-primary { background: #171717; color: white; }
  .kf-save-bar .kf-save-dismiss { color: #737373; }
`
