# CareerPilot feature checklist and test status

Legend: **Done** = code written and connected end to end. **Partial** = works with a stated limitation. **Not done** = not implemented.
"Tested" always says *how*; nothing below was run against a real MySQL database or a real Spring Boot instance yet.

## What was actually verified in the build environment (no internet, no Maven, no MySQL)
| Check | Result |
|---|---|
| Java sources type-checked with the JDK compiler against hand-written stand-ins for Spring/JPA | Passed for entities, DTOs, services, repositories (controllers, config and the exception handler were only reviewed by reading) |
| Scoring engine (`EvaluationService`) run on sample answers | Behaves as designed: empty = 0, full answer = 100, keyword-only answer capped at 25, off-topic capped at 15, filler words counted only for speech |
| Frontend JSX transpiled and type-checked (TypeScript `checkJs`) | No unknown names or imports; only noise from missing React typings |
| Frontend UI driven in headless Chromium at 390x844 (phone), 820 (tablet), 1280 (desktop) against a **mock** of the API built from the backend DTOs, with a fake camera and microphone | 30+ checks passed: redirect when logged out, register validation, auto login, empty dashboard (no fake numbers), setup, device check, interview room (timer, Ava/Alex/CareerPilot AI rotation, camera preview, typed answer saved only after success, next question, end-interview confirmation), results ("rule-based, not AI" banner), history, performance, question bank, bookmarks, practice, profile save, expired-token handling, no horizontal scrolling on any page |
| **Not run:** Maven compile/tests, MySQL, `npm install`/`vite build`/ESLint, the real backend with the real frontend, a real Android phone, real speech recognition, spoken voices, SMTP | **You must run these** (README section 4, `scripts/verify-backend.sh`) |

## Features
| Area | Status | Notes |
|---|---|---|
| Landing page | Done | Hero, features, workflow, scoring note, footer; subtle animated gradient |
| Registration / login | Done | Validation, show/hide password, loading and error states, field errors from the API, BCrypt hashes, JWT |
| Protected routes, logout, expired sessions | Done | Any 401 clears the session and shows "session expired" |
| Profile (name, e-mail, education, skills, target role) | Done | E-mail change returns a fresh token |
| Profile photo | Not done | Initials avatar shown instead |
| Dashboard | Done | Every number comes from the database; averages show "-" until you finish an interview |
| Interview setup (role, difficulty, type, count, time, skill focus, interviewer) | Done | Settings are saved with the interview |
| Device check and rules page | Done | Camera, microphone level meter, speech support, clear error messages, typing fallback |
| Interview room | Done (untested on a phone) | Spoken questions with distinct voices, countdown, progress, camera preview, record/stop, transcript editing, typed fallback, safe timer, end confirmation |
| Speech-to-text | Partial | Uses the browser's engine (Chrome). Needs internet; accuracy varies. If unsupported, the user is told and types |
| Question generation | Done | 91-question bank in the backend, filtered by role, type, difficulty and optional focus; no repeats inside an interview; recently seen questions are deprioritised |
| AI question generation | Not done | Not needed; no paid API is used |
| Answer evaluation | Done (rule-based) | Key concepts 50%, relevance 20%, completeness 20%, clarity 10%; caps for very short or off-topic answers. Labelled "not AI" everywhere |
| Results | Done | Overall and per-question scores, strengths, improvements, missing concepts, reference answers, study topics, summary |
| Interview history | Done | Search, filter, sort, view, delete; users only see their own data |
| Performance analytics | Done | Score trend, averages by type and role, topic performance (flags small samples), strengths/weak areas, latest-vs-previous |
| Question bank / bookmarks / practice mode | Done | Practice answers are scored but not saved |
| Study recommendations | Done | Derived from your real weak topics |
| Session recovery | Partial | A browser refresh or reopened tab resumes the unfinished interview from the first unanswered question (saved answers kept); there is a warning before closing with unsaved text. The remaining timer is not restored |
| Export results | Partial | "Export PDF" uses the browser's Print dialog (Save as PDF); no server-side PDF |
| E-mail | Partial | Welcome and interview-summary e-mails when SMTP is configured; practice reminders **not done** |
| Resume upload and skill extraction | Not done | |
| Accessibility | Partial | Labels, focus outlines, keyboard-usable controls, dialog roles, reduced-motion support; no formal audit |
| Responsive layout | Done (mock-tested) | Drawer navigation on small screens |
| Security | Done (untested) | Secrets from environment, BCrypt, JWT, owner-scoped queries, validation, JSON errors, CORS. **Not done:** login rate limiting, password reset/change |
| Automated tests | Partial | Unit tests for the scoring engine only |

## Known limitations worth stating in a demo
* Keyword scoring can miss a correct answer that uses different words, and can reward an answer that only mentions the right terms. That is why it is called a study guide.
* Speech-to-text quality depends on the browser, language setting (Profile > Speech language) and noise.
* Camera is video-only in the room (the microphone is left to the speech engine to avoid conflicts on Android).
