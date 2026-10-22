import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FiClock, FiMic, FiMicOff, FiRepeat, FiSend, FiSkipForward, FiSquare, FiVideo, FiVideoOff, FiVolume2, FiVolumeX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import * as api from '../api'
import { Alert, Badge, Button, Card, ErrorState, FullPageSpinner, Modal, ProgressBar } from '../components/ui'
import { useToast } from '../context/toastContext'
import useAsync from '../hooks/useAsync'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import { DIFFICULTIES, SPEECH_LANGUAGES, labelOf } from '../utils/constants'
import { clock, joinText } from '../utils/format'
import { INTERVIEWERS, interviewerForIndex } from '../utils/interviewers'
import { explainMediaError } from '../utils/media'
import { PREF_INTERVIEWER, PREF_SPEECH_LANG, readPref, writePref } from '../utils/prefs'
import { speak, stopSpeaking, synthSupported } from '../utils/speech'

const isDirty = (d) => d.text.trim() !== d.savedText.trim()

function initialDrafts(questions) {
  const drafts = {}
  questions.forEach((q) => {
    const text = q.savedAnswer || ''
    drafts[q.order] = { text, savedText: text, method: q.inputMethod === 'SPEECH' ? 'SPEECH' : 'TYPED' }
  })
  return drafts
}

function Room({ id, interview, questions }) {
  const navigate = useNavigate()
  const toast = useToast()
  const total = questions.length
  const limit = interview.timePerQuestionSeconds

  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !q.answered)
    return firstOpen === -1 ? total - 1 : firstOpen
  })
  const [drafts, setDrafts] = useState(() => initialDrafts(questions))
  const [deadline, setDeadline] = useState(() => Date.now() + limit * 1000)
  const [now, setNow] = useState(() => Date.now())
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [saveError, setSaveError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null) // null | end | finish | finishing | finish-error
  const [finishError, setFinishError] = useState('')
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [lang, setLang] = useState(() => readPref(PREF_SPEECH_LANG, 'en-IN'))
  const [interviewerPref] = useState(() => {
    const v = readPref(PREF_INTERVIEWER, 'auto')
    return INTERVIEWERS[v] ? v : null
  })
  const [stream, setStream] = useState(null)
  const [cameraOn, setCameraOn] = useState(true)
  const [cameraMessage, setCameraMessage] = useState('')

  const videoRef = useRef(null)
  const latest = useRef({})
  const pending = useRef({})
  const timeUpFired = useRef(false)
  const finishingRef = useRef(false)
  const pausedAt = useRef(0)
  const lastEarly = useRef(false)
  const timeUpHandler = useRef(() => {})

  useEffect(() => {
    latest.current = { index, drafts, modal, deadline }
  })

  const question = questions[index]
  const draft = drafts[question.order]
  const interviewer = interviewerForIndex(index, interviewerPref)
  const remaining = Math.min(limit, Math.max(0, Math.ceil((deadline - now) / 1000)))

  // ---------- speech to text
  const appendFinal = useCallback(
    (chunk) => {
      const order = questions[latest.current.index].order
      setDrafts((cur) => ({ ...cur, [order]: { ...cur[order], text: joinText(cur[order].text, chunk), method: 'SPEECH' } }))
      setSaveState('idle')
    },
    [questions],
  )
  const recognition = useSpeechRecognition({ lang, onFinal: appendFinal })
  const stopRecording = recognition.stop

  // ---------- camera preview (video only; the microphone is used by speech recognition)
  useEffect(() => {
    let cancelled = false
    let s = null
    async function open() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraMessage('Camera is not available in this browser. You can continue without it.')
        return
      }
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        setStream(s)
      } catch (err) {
        if (!cancelled) setCameraMessage(`${explainMediaError(err, 'Camera')} You can continue without it.`)
      }
    }
    open()
    return () => {
      cancelled = true
      if (s) s.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream, cameraOn])

  const toggleCamera = () => {
    const next = !cameraOn
    if (stream) stream.getVideoTracks().forEach((t) => { t.enabled = next })
    setCameraOn(next)
  }

  // ---------- spoken questions
  const speakQuestion = useCallback(
    (i) =>
      speak(questions[i].questionText, interviewerForIndex(i, interviewerPref), {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      }),
    [questions, interviewerPref],
  )

  useEffect(() => {
    if (!muted) speakQuestion(index)
    return () => {
      stopSpeaking()
      setSpeaking(false)
    }
  }, [index, muted, speakQuestion])

  // ---------- saving answers
  const persist = useCallback(
    async (order) => {
      const d = latest.current.drafts[order]
      if (!d || !isDirty(d)) return true
      const text = d.text.trim()
      const used = limit - Math.max(0, Math.ceil((latest.current.deadline - Date.now()) / 1000))
      const body = { answerText: text, inputMethod: d.method, timeTakenSeconds: Math.max(0, Math.min(used, limit)) }
      setSaveState('saving')
      try {
        await api.saveAnswer(id, order, body)
        delete pending.current[order]
        setDrafts((cur) => ({ ...cur, [order]: { ...cur[order], savedText: text } }))
        setSaveState('saved')
        setSaveError('')
        return true
      } catch (err) {
        pending.current[order] = { order, ...body }
        setSaveState('error')
        setSaveError(api.errorMessage(err))
        return false
      }
    },
    [id, limit],
  )

  const goTo = useCallback(
    (i) => {
      stopRecording()
      stopSpeaking()
      setIndex(i)
      setDeadline(Date.now() + limit * 1000)
      setNow(Date.now())
      setSaveState('idle')
      setSaveError('')
      timeUpFired.current = false
    },
    [limit, stopRecording],
  )

  const openModal = (type) => {
    if (!latest.current.modal) pausedAt.current = Date.now()
    stopSpeaking()
    setModal(type)
  }

  const closeModal = () => {
    const paused = Date.now() - pausedAt.current
    setDeadline((d) => d + paused) // the timer was paused while the dialog was open
    setNow(Date.now())
    setModal(null)
  }

  const finish = useCallback(
    async (early) => {
      if (finishingRef.current) return
      finishingRef.current = true
      lastEarly.current = early
      stopRecording()
      stopSpeaking()
      openModal('finishing')
      await persist(questions[latest.current.index].order) // a failure here is tolerated: it is re-sent below
      try {
        await api.completeInterview(id, { endedEarly: early, answers: Object.values(pending.current) })
        navigate(`/results/${id}`, { replace: true })
      } catch (err) {
        setFinishError(api.errorMessage(err))
        setModal('finish-error')
        finishingRef.current = false
      }
    },
    // openModal only touches refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, navigate, persist, questions, stopRecording],
  )

  // ---------- timer (uses real clock time, so it stays correct when the tab is throttled)
  useEffect(() => {
    timeUpHandler.current = async () => {
      const i = latest.current.index
      stopRecording()
      await persist(questions[i].order)
      if (latest.current.index !== i || finishingRef.current) return
      if (i < total - 1) goTo(i + 1)
      else finish(false)
    }
  })

  useEffect(() => {
    const timer = setInterval(() => {
      const l = latest.current
      if (l.modal || finishingRef.current) return
      const t = Date.now()
      setNow(t)
      if (t >= l.deadline && !timeUpFired.current) {
        timeUpFired.current = true
        timeUpHandler.current()
      }
    }, 250)
    return () => clearInterval(timer)
  }, [])

  // warn before the page is closed with unsaved work
  useEffect(() => {
    const handler = (e) => {
      const unsaved = Object.values(latest.current.drafts).some(isDirty) || Object.keys(pending.current).length > 0
      if (unsaved) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ---------- user actions
  const setText = (value) => {
    setDrafts((cur) => ({ ...cur, [question.order]: { ...cur[question.order], text: value } }))
    setSaveState('idle')
  }

  const startRecording = () => {
    stopSpeaking()
    setSpeaking(false)
    recognition.start()
  }

  const submit = async () => {
    if (!draft.text.trim() && !draft.savedText.trim()) {
      setSaveState('error')
      setSaveError('Type or record an answer first. To skip this question, press Next question.')
      return
    }
    stopRecording()
    setBusy(true)
    await persist(question.order)
    setBusy(false)
  }

  const next = async () => {
    setBusy(true)
    stopRecording()
    const ok = await persist(question.order)
    setBusy(false)
    if (!ok) toast.info('This answer could not be saved yet. It will be sent again when you finish.')
    if (index < total - 1) goTo(index + 1)
    else openModal('finish')
  }

  const changeLang = (value) => {
    setLang(value)
    writePref(PREF_SPEECH_LANG, value)
  }

  const savedCount = Object.values(drafts).filter((d) => d.savedText.trim()).length
  const timerClass = remaining <= 10 ? 'danger' : remaining <= 20 ? 'warn' : ''
  const isLast = index === total - 1
  const locked = busy || Boolean(modal)

  let status = null
  if (recognition.listening && !recognition.processing) {
    status = <><span className="rec-dot" aria-hidden="true" /> Recording. Speak now, then press Stop Recording.</>
  } else if (recognition.processing) {
    status = <><span className="spinner" aria-hidden="true" /> Processing the last words...</>
  } else if (saveState === 'saving') {
    status = <><span className="spinner" aria-hidden="true" /> Submitting your answer...</>
  } else if (saveState === 'saved') {
    status = <><FiCheckCircle style={{ color: 'var(--good)' }} aria-hidden="true" /> Answer submitted and saved.</>
  } else if (saveState === 'error') {
    status = <><FiAlertTriangle style={{ color: 'var(--low)' }} aria-hidden="true" /> {saveError}</>
  } else if (isDirty(draft)) {
    status = 'You have unsubmitted changes.'
  } else if (draft.savedText.trim()) {
    status = 'This answer is saved.'
  }

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-header-inner">
          <div className="flex">
            <Badge tone="accent">{interview.role}</Badge>
            <Badge>{labelOf(DIFFICULTIES, interview.difficulty)}</Badge>
            <span className="muted small">Question {index + 1} of {total}</span>
          </div>
          <div className="flex">
            <div className={`timer ${timerClass}`} role="timer" aria-label={`Time left ${clock(remaining)}`}><FiClock aria-hidden="true" /> {clock(remaining)}</div>
            <Button variant="danger" size="sm" disabled={modal === 'finishing'} onClick={() => openModal('end')}>End Interview</Button>
          </div>
        </div>
      </header>

      <div className="room-body">
        <div className="stack">
          <Card>
            <div className="interviewer">
              <img className={`avatar-img ${speaking ? 'speaking' : ''}`} src={interviewer.image} alt={`${interviewer.name}, ${interviewer.title}`} style={{ borderColor: interviewer.accent }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{interviewer.name}</strong>
                <div className="muted small">{interviewer.title}{speaking ? ' - speaking...' : ''}</div>
              </div>
              {synthSupported && (
                <div className="flex">
                  <Button variant="ghost" size="sm" className="btn-icon" onClick={() => speakQuestion(index)} disabled={muted || locked} aria-label="Repeat the question" title="Repeat question"><FiRepeat /></Button>
                  <Button variant="ghost" size="sm" className="btn-icon" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Turn spoken questions on' : 'Mute spoken questions'} title={muted ? 'Unmute' : 'Mute'}>{muted ? <FiVolumeX /> : <FiVolume2 />}</Button>
                </div>
              )}
            </div>
            <div className="flex" style={{ marginBottom: 10 }}>
              {question.topic && <Badge tone="violet">{question.topic}</Badge>}
              <Badge>{labelOf(DIFFICULTIES, question.difficulty)}</Badge>
            </div>
            <p className="question-text" aria-live="polite">{question.questionText}</p>
            <ProgressBar value={(remaining / limit) * 100} tone={remaining <= 10 ? 'low' : remaining <= 20 ? 'ok' : ''} label="Time remaining for this question" />
          </Card>

          <Card title="Your answer">
            {!recognition.supported && (
              <div style={{ marginBottom: 12 }}>
                <Alert tone="info" icon={FiMicOff}>Speech-to-text is not supported in this browser, so please type your answer. Chrome supports voice answers.</Alert>
              </div>
            )}
            {recognition.error && <div style={{ marginBottom: 12 }}><Alert tone="warn" icon={FiAlertTriangle}>{recognition.error}</Alert></div>}
            <label htmlFor="answer" className="sr-only">Your answer</label>
            <textarea id="answer" className="textarea" placeholder="Type your answer here, or press Start Recording and speak..." value={draft.text} onChange={(e) => setText(e.target.value)} disabled={locked} rows={6} />
            {recognition.interim && <p className="small muted" style={{ margin: '6px 0 0', fontStyle: 'italic' }}>Hearing: {recognition.interim}</p>}
            <div className="status-line" aria-live="polite">{status}</div>

            <div className="action-bar">
              {recognition.supported && (recognition.listening && !recognition.processing ? (
                <Button variant="secondary" icon={<FiSquare />} onClick={stopRecording}>Stop Recording</Button>
              ) : (
                <Button variant="secondary" icon={<FiMic />} onClick={startRecording} disabled={locked || recognition.processing}>Start Recording</Button>
              ))}
              <Button icon={<FiSend />} onClick={submit} disabled={locked} loading={saveState === 'saving'}>Submit Answer</Button>
              <Button variant="secondary" icon={<FiSkipForward />} onClick={next} disabled={locked}>{isLast ? 'Finish Interview' : 'Next Question'}</Button>
            </div>
            {recognition.supported && (
              <div className="row-between mt">
                <span className="small muted">Leave the box empty and press Next to skip a question.</span>
                <label className="small flex" htmlFor="lang">
                  Speech language
                  <select id="lang" className="select" style={{ width: 'auto', minHeight: 34, padding: '4px 8px' }} value={lang} onChange={(e) => changeLang(e.target.value)} disabled={recognition.listening}>
                    {SPEECH_LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </label>
              </div>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="Camera">
            <div className="video-box">
              {stream && cameraOn ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="video-off">{cameraMessage || (stream ? 'Camera is turned off.' : 'Starting camera...')}</div>}
            </div>
            <div className="row-between mt">
              <span className="small muted">Preview only. Never recorded or analysed.</span>
              {stream && <Button variant="secondary" size="sm" icon={cameraOn ? <FiVideoOff /> : <FiVideo />} onClick={toggleCamera}>{cameraOn ? 'Turn off' : 'Turn on'}</Button>}
            </div>
          </Card>

          <Card title="Progress">
            <div className="small muted" style={{ marginBottom: 8 }}>{savedCount} of {total} answers saved</div>
            <ProgressBar value={(savedCount / total) * 100} label="Answers saved" />
            <div className="q-dots mt" aria-label="Question progress">
              {questions.map((q, i) => (
                <span key={q.order} className={`q-dot ${i === index ? 'current' : drafts[q.order].savedText.trim() ? 'done' : ''}`} title={`Question ${i + 1}`}>{i + 1}</span>
              ))}
            </div>
          </Card>

          <Card title="Tips">
            <ul className="clean muted small">
              <li>Define the idea, explain how it works, then give an example.</li>
              <li>When the timer ends your answer is saved and the next question starts.</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={modal === 'end'}
        title="End the interview early?"
        onClose={closeModal}
        actions={<><Button variant="secondary" onClick={closeModal}>Keep going</Button><Button variant="danger" onClick={() => finish(true)}>End and see results</Button></>}
      >
        <p className="muted">You have saved {savedCount} of {total} answers. Your saved answers will be scored, and questions without an answer count as 0.</p>
      </Modal>

      <Modal
        open={modal === 'finish'}
        title="Finish the interview?"
        onClose={closeModal}
        actions={<><Button variant="secondary" onClick={closeModal}>Review answers</Button><Button onClick={() => finish(false)}>Finish and see results</Button></>}
      >
        <p className="muted">You have saved {savedCount} of {total} answers. After you finish you cannot change them.</p>
      </Modal>

      <Modal open={modal === 'finishing'} title="Calculating your results">
        <div className="flex"><span className="spinner" aria-hidden="true" /> <span className="muted">Saving your answers and scoring them...</span></div>
      </Modal>

      <Modal
        open={modal === 'finish-error'}
        title="We could not finish yet"
        onClose={closeModal}
        actions={<><Button variant="secondary" onClick={closeModal}>Back to interview</Button><Button onClick={() => finish(lastEarly.current)}>Try again</Button></>}
      >
        <Alert tone="error" icon={FiAlertTriangle}>{finishError}</Alert>
        <p className="muted small mt">Your answers are still on this page and nothing is lost. Check your connection and try again.</p>
      </Modal>
    </div>
  )
}

export default function InterviewRoom() {
  const { id } = useParams()
  const detail = useAsync(() => api.getInterview(id), [id])

  if (detail.loading && !detail.data) return <FullPageSpinner />
  if (detail.error) {
    const notFound = detail.error.response && detail.error.response.status === 404
    return (
      <div className="fullpage">
        <div style={{ maxWidth: 480 }}>
          <ErrorState message={notFound ? 'This interview was not found.' : api.errorMessage(detail.error)} onRetry={notFound ? undefined : detail.reload} />
          <p className="center mt"><Link to="/dashboard">Back to dashboard</Link></p>
        </div>
      </div>
    )
  }
  if (detail.data.result) return <Navigate to={`/results/${id}`} replace />
  return <Room key={id} id={id} interview={detail.data.interview} questions={detail.data.questions} />
}
