/**
 * The Google Picker API needs its own API key (separate from the OAuth client ID — this
 * authenticates the Picker library's own usage; the OAuth access token is what actually
 * grants Drive access). From Google Cloud Console → APIs & Services → Credentials, after
 * enabling the "Google Picker API" in the API Library.
 *
 * Unlike the OAuth client ID, this key isn't bound to a specific extension ID, so it's
 * worth restricting in Cloud Console once docs/picker.html has a stable URL: Credentials →
 * this key → Application restrictions → HTTP referrers → that URL, and API restrictions →
 * Picker API only. That keeps an unrestricted key sitting in this public repo from being
 * usable against any other Google API on this project.
 */
export const GOOGLE_PICKER_API_KEY = 'AIzaSyAdctpuMUcYC-WxFUadpIrurwxw5_Lm_T8'
