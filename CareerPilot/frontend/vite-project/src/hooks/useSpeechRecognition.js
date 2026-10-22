import { useCallback, useEffect, useRef, useState } from 'react'

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined
const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)

export const speechRecognitionSupported = Boolean(Recognition)

const FATAL_ERRORS = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings, or type your answer instead.',
  'service-not-allowed': 'Speech recognition is blocked on this device. Please type your answer instead.',
  'audio-capture': 'No working microphone was found. Check your microphone or type your answer instead.',
  network: 'The speech service could not be reached (it needs an internet connection). Please type your answer instead.',
}

/**
 * Browser speech-to-text. Calls onFinal(text) for every finished phrase.
 * Chrome stops listening after a pause, so we restart automatically until stop() is called.
 */
export default function useSpeechRecognition({ lang = 'en-IN', onFinal }) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const wantRef = useRef(false)
  const onFinalRef = useRef(onFinal)

  useEffect(() => {
    onFinalRef.current = onFinal
  })

  const start = useCallback(() => {
    if (!Recognition) return
    setError('')
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = !isAndroid // continuous mode repeats text on many Android phones

    rec.onresult = (event) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          const clean = text.trim()
          if (clean && onFinalRef.current) onFinalRef.current(clean)
        } else {
          interimText += text
        }
      }
      setInterim(interimText)
    }

    rec.onerror = (event) => {
      if (FATAL_ERRORS[event.error]) {
        wantRef.current = false
        setError(FATAL_ERRORS[event.error])
      } else if (event.error === 'no-speech') {
        setError('No speech detected yet. Speak closer to the microphone.')
      }
    }

    rec.onend = () => {
      setInterim('')
      if (wantRef.current) {
        try {
          rec.start()
          return
        } catch {
          wantRef.current = false
        }
      }
      setListening(false)
      setProcessing(false)
    }

    recRef.current = rec
    wantRef.current = true
    try {
      rec.start()
      setListening(true)
    } catch {
      wantRef.current = false
      setError('Could not start the microphone. Please type your answer instead.')
    }
  }, [lang])

  const stop = useCallback(() => {
    wantRef.current = false
    setProcessing(true)
    try {
      if (recRef.current) recRef.current.stop()
    } catch {
      /* ignore */
    }
    // Safety net: some browsers never fire onend after stop().
    setTimeout(() => {
      if (wantRef.current) return // the user started recording again
      setListening(false)
      setProcessing(false)
      setInterim('')
    }, 2500)
  }, [])

  useEffect(
    () => () => {
      wantRef.current = false
      try {
        if (recRef.current) recRef.current.abort()
      } catch {
        /* ignore */
      }
    },
    [],
  )

  return { supported: speechRecognitionSupported, listening, processing, interim, error, start, stop }
}
