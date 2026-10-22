import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiCircle, FiMic, FiPlay, FiVideo } from 'react-icons/fi'
import * as api from '../api'
import { Brand } from '../components/AppLayout'
import { Alert, Badge, Button, Card, ErrorState, FullPageSpinner } from '../components/ui'
import { speechRecognitionSupported } from '../hooks/useSpeechRecognition'
import useAsync from '../hooks/useAsync'
import { DIFFICULTIES, TIME_OPTIONS, TYPES, labelOf } from '../utils/constants'
import { explainMediaError } from '../utils/media'
import { synthSupported } from '../utils/speech'

const RULES = [
  'Find a quiet place and speak clearly. You can also type every answer.',
  'Each question has its own countdown. When it ends, your current answer is saved and the next question starts.',
  'Press Start Recording after the question has been read, and Stop Recording when you are done.',
  'You can edit the transcript before pressing Submit Answer. Speech-to-text can make mistakes.',
  'Use full sentences: define the idea, explain how it works and give an example.',
]

async function probeDevices() {
  const gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  if (!gum) {
    const msg = 'This browser cannot access camera or microphone (the page must be opened over HTTPS).'
    return { stream: null, camera: { ok: false, message: msg }, mic: { ok: false, message: msg } }
  }
  const tracks = []
  let camera
  let mic
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    tracks.push(...s.getTracks())
    camera = { ok: true, message: 'Camera is working.' }
  } catch (err) {
    camera = { ok: false, message: explainMediaError(err, 'Camera') }
  }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true })
    tracks.push(...s.getTracks())
    mic = { ok: true, message: 'Microphone is working.' }
  } catch (err) {
    mic = { ok: false, message: explainMediaError(err, 'Microphone') }
  }
  return { stream: tracks.length ? new MediaStream(tracks) : null, camera, mic }
}

function StatusRow({ icon: Icon, title, state }) {
  const tone = state === null ? 'idle' : state.ok ? 'ok' : 'bad'
  const StatusIcon = state === null ? FiCircle : state.ok ? FiCheckCircle : FiAlertTriangle
  return (
    <div className="check-item">
      <StatusIcon className={`${tone}-icon`} aria-hidden="true" />
      <div>
        <strong><Icon aria-hidden="true" /> {title}</strong>
        <div className={`small ${state && !state.ok ? '' : 'muted'}`}>{state === null ? 'Not checked yet' : state.message}</div>
      </div>
    </div>
  )
}

export default function InterviewCheck() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const detail = useAsync(() => api.getInterview(id), [id])

  const [camera, setCamera] = useState(null)
  const [mic, setMic] = useState(null)
  const [checking, setChecking] = useState(false)
  const [typedOnly, setTypedOnly] = useState(false)
  const [level, setLevel] = useState(0)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => stopStream, [stopStream])

  // show the camera preview
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream, camera])

  // live microphone level meter
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return undefined
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return undefined
    let raf = 0
    let ctx
    try {
      ctx = new Ctx()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      ctx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i] - 128))
        setLevel(Math.min(100, Math.round((peak / 64) * 100)))
        raf = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      /* the level meter is optional */
    }
    return () => {
      cancelAnimationFrame(raf)
      if (ctx) ctx.close().catch(() => {})
    }
  }, [stream])

  const check = async () => {
    stopStream()
    setStream(null)
    setChecking(true)
    const result = await probeDevices()
    streamRef.current = result.stream
    setStream(result.stream)
    setCamera(result.camera)
    setMic(result.mic)
    setChecking(false)
  }

  const start = () => {
    stopStream()
    navigate(`/interview/${id}/room`, { replace: true })
  }

  if (detail.loading && !detail.data) return <FullPageSpinner />
  if (detail.error) {
    const notFound = detail.error.response && detail.error.response.status === 404
    return (
      <div className="fullpage">
        <div style={{ maxWidth: 480 }}>
          <ErrorState message={notFound ? 'This interview was not found.' : api.errorMessage(detail.error)} onRetry={notFound ? undefined : detail.reload} />
          <p className="center mt"><Link to="/interview/new">Set up a new interview</Link></p>
        </div>
      </div>
    )
  }
  if (detail.data.result) return <Navigate to={`/results/${id}`} replace />

  const iv = detail.data.interview
  const warning = location.state && location.state.warning
  const canStart = (camera && camera.ok) || (mic && mic.ok) || typedOnly

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-header-inner"><Brand to="/dashboard" /><Link to="/dashboard" className="btn btn-ghost btn-sm">Leave</Link></div>
      </header>
      <div className="page page-narrow stack">
        <div>
          <h1>Before you start</h1>
          <p className="muted">Check your devices and read the rules. Camera and microphone are both optional.</p>
        </div>

        {warning && <Alert tone="warn" icon={FiAlertCircle}>{warning}</Alert>}

        <Card title="Your interview">
          <div className="flex">
            <Badge tone="accent">{iv.role}</Badge>
            <Badge>{labelOf(DIFFICULTIES, iv.difficulty)}</Badge>
            <Badge>{labelOf(TYPES, iv.interviewType)}</Badge>
            <Badge>{iv.questionCount} questions</Badge>
            <Badge>{labelOf(TIME_OPTIONS, iv.timePerQuestionSeconds)} each</Badge>
            {iv.focusTopics.length > 0 && <Badge tone="violet">Focus: {iv.focusTopics.join(', ')}</Badge>}
          </div>
        </Card>

        <div className="grid grid-2">
          <Card title="Device check">
            <StatusRow icon={FiVideo} title="Camera" state={camera} />
            <StatusRow icon={FiMic} title="Microphone" state={mic} />
            {mic && mic.ok && (
              <div style={{ margin: '4px 0 12px' }}>
                <div className="small muted">Say something to see the level move:</div>
                <div className="mic-meter" role="meter" aria-valuenow={level} aria-valuemin={0} aria-valuemax={100} aria-label="Microphone level"><span style={{ width: `${level}%` }} /></div>
              </div>
            )}
            <div className="check-item">
              {speechRecognitionSupported ? <FiCheckCircle className="ok-icon" aria-hidden="true" /> : <FiAlertTriangle className="bad-icon" aria-hidden="true" />}
              <div>
                <strong>Speech-to-text</strong>
                <div className="small muted">{speechRecognitionSupported ? 'Supported in this browser (it needs an internet connection).' : 'Not supported in this browser. You can type your answers. Chrome works best.'}</div>
              </div>
            </div>
            <div className="check-item">
              {synthSupported ? <FiCheckCircle className="ok-icon" aria-hidden="true" /> : <FiAlertTriangle className="bad-icon" aria-hidden="true" />}
              <div>
                <strong>Spoken questions</strong>
                <div className="small muted">{synthSupported ? 'Supported. Questions are also always shown on screen.' : 'Not supported. Questions will only be shown on screen.'}</div>
              </div>
            </div>
            <Button variant="secondary" block loading={checking} icon={!checking && <FiVideo />} onClick={check}>{camera || mic ? 'Check devices again' : 'Check devices'}</Button>
          </Card>

          <Card title="Camera preview">
            <div className="video-box">
              {stream && camera && camera.ok ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="video-off">{camera && !camera.ok ? 'Camera unavailable. You can still continue.' : 'Press "Check devices" to see yourself here.'}</div>}
            </div>
            <p className="small muted mt" style={{ marginBottom: 0 }}>The preview stays on your device. Nothing is recorded, uploaded or analysed, and your face and emotions are never evaluated.</p>
          </Card>
        </div>

        <Card title="Rules and tips">
          <ul className="clean muted">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
        </Card>

        {!((camera && camera.ok) || (mic && mic.ok)) && (
          <label className="check">
            <input type="checkbox" checked={typedOnly} onChange={(e) => setTypedOnly(e.target.checked)} />
            <span>I will answer by typing, without using my camera or microphone.</span>
          </label>
        )}

        <div className="flex">
          <Button icon={<FiPlay />} disabled={!canStart} onClick={start}>Start Interview</Button>
          <Link className="btn btn-ghost" to="/interview/new">Change settings</Link>
        </div>
        {!canStart && <p className="small muted">Run the device check, or tick the typing option above to continue.</p>}
      </div>
    </div>
  )
}
