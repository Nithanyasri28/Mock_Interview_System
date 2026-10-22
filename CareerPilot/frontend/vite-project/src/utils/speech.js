// Spoken questions using the browser's speechSynthesis. Everything degrades gracefully
// when the browser has no speech support or no matching voice.

export const synthSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function waitForVoices(timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!synthSupported) return resolve([])
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) return resolve(existing)
    const done = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, timeoutMs)
  })
}

export function pickVoice(profile, voices) {
  if (!voices || voices.length === 0) return null
  const english = voices.filter((v) => /^en/i.test(v.lang))
  const pool = english.length > 0 ? english : voices
  for (const key of profile.prefer) {
    const found = pool.find((v) => {
      const name = v.name.toLowerCase()
      if (!name.includes(key)) return false
      return key !== 'male' || !name.includes('female')
    })
    if (found) return found
  }
  return pool[profile.fallbackIndex] || pool[0]
}

/** Speaks text with the interviewer's voice. Returns false if speech is not available. */
export async function speak(text, profile, handlers = {}) {
  if (!synthSupported || !text) return false
  try {
    const voices = await waitForVoices()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice(profile, voices)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = 'en-US'
    }
    utterance.pitch = profile.pitch
    utterance.rate = profile.rate
    utterance.onstart = () => handlers.onStart && handlers.onStart()
    utterance.onend = () => handlers.onEnd && handlers.onEnd()
    utterance.onerror = () => handlers.onEnd && handlers.onEnd()
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function stopSpeaking() {
  if (synthSupported) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
}
