// Small helpers for preferences kept on this device (localStorage). Never throws.
export function readPref(key, fallback) {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? fallback : v
  } catch {
    return fallback
  }
}

export function writePref(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage may be unavailable (private mode); preferences just will not persist */
  }
}

export const PREF_INTERVIEWER = 'cp_pref_interviewer' // auto | ava | alex | bot
export const PREF_SPEECH_LANG = 'cp_pref_speech_lang' // en-IN ...
