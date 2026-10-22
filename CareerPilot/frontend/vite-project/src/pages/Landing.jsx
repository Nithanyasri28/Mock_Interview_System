import { Link } from 'react-router-dom'
import { FiBarChart2, FiBookOpen, FiCheckCircle, FiCpu, FiMic, FiSmartphone, FiTarget, FiUserCheck } from 'react-icons/fi'
import { Brand } from '../components/AppLayout'
import { Card } from '../components/ui'
import { useAuth } from '../context/authContext'
import { INTERVIEWERS } from '../utils/interviewers'

const FEATURES = [
  { icon: FiTarget, title: 'Role-specific questions', text: 'Java, Frontend, Backend, Full Stack and Data Analyst questions at Beginner, Intermediate or Advanced level, plus HR and behavioral rounds.' },
  { icon: FiMic, title: 'Speak or type your answers', text: 'A spoken interviewer, a countdown timer and speech-to-text where your browser supports it. Typing always works as a fallback.' },
  { icon: FiCpu, title: 'Transparent feedback', text: 'Every answer is scored on key concepts, relevance, completeness and clarity. The scoring is rule-based and we say so on every result page.' },
  { icon: FiBarChart2, title: 'Real progress tracking', text: 'Your history, score trends and weak topics come only from interviews you actually completed.' },
  { icon: FiBookOpen, title: 'Question bank and practice', text: 'Browse questions by topic, bookmark the hard ones and practise single questions without a full interview.' },
  { icon: FiSmartphone, title: 'Works on your phone', text: 'A responsive layout built for Android, tablets and laptops.' },
]

const STEPS = [
  { title: 'Choose your role', text: 'Pick a role, difficulty, interview type and how many questions you want.' },
  { title: 'Check your devices', text: 'Test your camera and microphone, or choose to type your answers.' },
  { title: 'Take the interview', text: 'Answer each question before the timer ends, by voice or by typing.' },
  { title: 'Review and improve', text: 'See per-question feedback, missing concepts and what to study next.' },
]

export default function Landing() {
  const { token } = useAuth()
  return (
    <div className="landing">
      <header className="hero">
        <nav className="landing-nav" style={{ position: 'relative', zIndex: 2 }} aria-label="Primary">
          <Brand to="/" />
          <div className="links">
            <a className="plain" href="#features">Features</a>
            <a className="plain" href="#how-it-works">How it works</a>
            {token ? (
              <Link className="btn btn-primary btn-sm" to="/dashboard">Open dashboard</Link>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm" to="/login">Log in</Link>
                <Link className="btn btn-primary btn-sm" to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>

        <div className="hero-inner">
          <div>
            <h1>Practice interviews like the <span>real thing</span>.</h1>
            <p className="lead">
              CareerPilot is a mock interview studio for students. Answer role-specific questions out loud or in writing,
              get clear feedback on every answer and track how you improve over time.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary" to={token ? '/interview/new' : '/register'}>Start Practicing</Link>
              <a className="btn btn-secondary" href="#features">Explore Features</a>
            </div>
          </div>
          <Card className="preview" aria-label="Example of the interview screen">
            <div className="interviewer">
              <img className="avatar-img" src={INTERVIEWERS.alex.image} alt="" />
              <div>
                <strong>{INTERVIEWERS.alex.name}</strong>
                <div className="muted small">{INTERVIEWERS.alex.title}</div>
              </div>
            </div>
            <div className="muted small">Sample question</div>
            <div className="bubble">What is the difference between an abstract class and an interface in Java?</div>
            <div className="chips mt">
              <span className="chip chip-static">Type your answer</span>
              <span className="chip chip-static">Or press Record</span>
            </div>
          </Card>
        </div>
      </header>

      <section className="section" id="features">
        <h2>Everything you need to prepare</h2>
        <p className="sub">Built around honest feedback, not flashy claims.</p>
        <div className="grid grid-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="feature">
              <div className="icon"><Icon aria-hidden="true" /></div>
              <h3>{title}</h3>
              <p className="muted" style={{ margin: 0 }}>{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <h2>How it works</h2>
        <p className="sub">Four steps from setup to a personal study plan.</p>
        <div className="grid grid-4">
          {STEPS.map((s, i) => (
            <Card key={s.title}>
              <div className="step-num">{i + 1}</div>
              <h3>{s.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <Card>
          <div className="row-between">
            <div style={{ maxWidth: 640 }}>
              <h2><FiUserCheck aria-hidden="true" /> About the scoring</h2>
              <p className="muted" style={{ margin: 0 }}>
                Scores are calculated with keyword, length and structure rules and never by a hidden AI model. They are a study guide,
                not a verdict. Your camera preview stays on your device, and facial expressions or emotions are never analysed.
              </p>
            </div>
            <Link className="btn btn-primary" to={token ? '/interview/new' : '/register'}><FiCheckCircle aria-hidden="true" /> Get started</Link>
          </div>
        </Card>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <Brand to="/" />
            <p className="muted small">A college project that helps students rehearse interviews and learn from their answers.</p>
          </div>
          <div>
            <strong>Product</strong>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
          </div>
          <div>
            <strong>Account</strong>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
