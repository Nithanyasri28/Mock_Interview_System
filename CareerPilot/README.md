# CareerPilot - AI Mock Interview System

A mock-interview practice app for students: choose a role, answer questions by voice or typing, get per-answer feedback,
and track your progress over time.

* **Frontend:** React 19 + Vite, React Router, Axios (`frontend/vite-project`)
* **Backend:** Java Spring Boot 4 (Java 17+), Spring Security + JWT, Spring Data JPA (`backend/backend/backend`)
* **Database:** MySQL 8

> **Scoring honesty:** answers are scored by **rule-based keyword matching** (key concepts, relevance, length, clarity).
> It is *not* an AI model, no paid API is needed, and every results page says so. Facial expressions and emotions are never analysed;
> the camera preview is only a mirror and is never recorded or uploaded.

> **Test status:** see [`docs/FEATURES.md`](docs/FEATURES.md). The backend has **not been compiled or run** yet and the frontend has not been
> built with Vite. Follow "Verify everything" below in Codespaces and report any error message.

---

## 1. Rotate your MySQL password first
The original ZIP contained a real database password. Treat it as leaked: change it in MySQL (or just use the scripts below, which create a
*new* dedicated user with a random password). If the project is on GitHub, also make the repository private; the old password stays in git history.
Passwords now live only in `backend/backend/backend/.env`, which is git-ignored. See `docs/BACKEND_SETUP.md`.

## 2. Run it from your Android phone with GitHub Codespaces (no laptop needed)
1. In Chrome on your phone open **github.com**, upload/push this project to a repository (a private one is best), then open
   **Code > Codespaces > Create codespace**. Tip: tick "Desktop site" in Chrome's menu if the editor looks cramped.
2. In the codespace terminal (menu **Terminal > New Terminal**) run the one-time setup:
   ```bash
   bash scripts/setup-codespace.sh
   ```
   It installs MySQL, creates the database and a random-password user, writes `backend/backend/backend/.env` and runs `npm install`.
3. Start the backend (first start downloads Maven packages, so it takes a few minutes). Wait for the line **"Question bank ready"**:
   ```bash
   bash scripts/run-backend.sh
   ```
4. Open a **second terminal** (the `+` icon in the terminal panel) and start the frontend:
   ```bash
   bash scripts/run-frontend.sh
   ```
5. Open the **Ports** tab. Find port **5173**, long-press it and choose **Port Visibility > Public**, then tap the globe/link icon to open it.
   The address looks like `https://<codespace-name>-5173.app.github.dev`. Open it in Chrome on your phone.
   *Only port 5173 needs to be public:* the React server forwards `/api` calls to the backend inside the codespace.
   Remember to stop the codespace when you are done (Codespaces menu > Stop) and set the port back to Private.
6. Register an account, then follow the checklist in section 4.

Use **Chrome** on Android: speech-to-text and the camera/microphone prompts work best there. The page is served over HTTPS, which the browser requires for camera and microphone.

## 3. Run it locally (Windows/Mac/Linux)
Prerequisites: Java 17+, Node 20+, MySQL 8 running.
```bash
# database (run in the MySQL shell; choose your own password)
CREATE DATABASE IF NOT EXISTS careerpilot_db;
CREATE USER 'careerpilot'@'localhost' IDENTIFIED BY 'your-new-password';
GRANT ALL PRIVILEGES ON careerpilot_db.* TO 'careerpilot'@'localhost';

# backend
cd backend/backend/backend
cp .env.example .env            # then edit DB_USERNAME, DB_PASSWORD and JWT_SECRET (openssl rand -base64 48)
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run

# frontend (second terminal)
cd frontend/vite-project
npm install
npm run dev                     # open http://localhost:5173
```

### Configuration
| Where | Variable | Meaning |
|---|---|---|
| `backend/.../.env` | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | MySQL connection (defaults: localhost:3306/careerpilot_db, user root, empty password) |
| | `JWT_SECRET` | 32+ characters. If empty a temporary random key is used and everyone is logged out on each restart |
| | `JWT_EXPIRATION_MINUTES` | Token lifetime (default 1440) |
| | `CORS_ALLOWED_ORIGINS` | Only needed if the frontend calls the backend directly (default allows localhost and `*.app.github.dev`) |
| | `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Optional welcome / summary e-mails. Everything works with `MAIL_ENABLED=false` |
| `frontend/vite-project/.env` | `VITE_API_URL` | Leave empty to use the built-in proxy (recommended) |
| | `VITE_PROXY_TARGET` | Backend address used by the proxy (default `http://localhost:8080`) |

Database tables are created automatically on first start (`ddl-auto=update`, which never deletes data). The 91-question bank is loaded from
`src/main/resources/questions.txt`; add lines to that file and restart to add questions. The existing `users` table only gains new nullable columns.

## 4. Verify everything (about 10 minutes)
**A. Backend smoke test** (terminal 3, while the backend runs): `bash scripts/verify-backend.sh` - every line should say PASS.
Also run `cd backend/backend/backend && ./mvnw test` (unit tests for the scoring rules; no database needed).
**B. Frontend build:** `cd frontend/vite-project && npm run build && npm run lint`.
**C. Phone walkthrough:**
1. Register, you land on the dashboard with *no* fake statistics ("No scores yet").
2. New interview: Java Developer / Beginner / Mixed / 5 questions / 30 s. Continue.
3. Device check: press *Check devices*, allow camera and microphone (or tick the typing option).
4. Start. Ava speaks the first question, Alex and CareerPilot AI alternate afterwards. Type an answer, press **Submit Answer** (you should see "Answer submitted and saved."), then **Next Question**.
5. Try **Start Recording**, speak, **Stop Recording**, check the transcript, submit. If your browser has no speech support you will see a clear message and can type.
6. Let one timer reach 0 - the answer is saved and the next question starts. Press **End Interview** - confirm the dialog.
7. Results: score, per-question breakdown, strengths, missing concepts, reference answers, "Rule-based, not AI" banner, bookmark and **Export PDF** (print dialog).
8. History (search/filter/sort/delete), Performance (charts appear after interviews), Question Bank (filters, bookmark, reference answer), Practice, Profile (edit and save).
9. Start an interview, close the tab, reopen the site: the dashboard offers **Resume interview**.
10. Log out, log in again.

## 5. Troubleshooting
| Symptom | Fix |
|---|---|
| Frontend says "Cannot reach the CareerPilot server" | The backend is not running or is still starting. Check terminal 1 for errors |
| Backend: `Access denied for user` | Wrong `DB_USERNAME`/`DB_PASSWORD` in `.env`. Re-run `bash scripts/setup-codespace.sh` (it keeps `.env` and re-syncs the MySQL user) |
| Backend: `Communications link failure` | MySQL is not running: `sudo service mysql start` |
| `JWT_SECRET must be at least 32 characters` | Make `JWT_SECRET` longer, or leave it empty for a temporary key |
| Phone opens a GitHub sign-in page | Port 5173 is still Private; set it to Public (or sign in to GitHub in the phone browser) |
| Camera or microphone not working | The page must be HTTPS (Codespaces URLs are). Allow permission in Chrome's site settings. Close other apps using the camera |
| No voice / speech-to-text | Use Chrome. It needs internet. You can always type. Spoken questions need a speech voice installed on the phone; the question is always shown on screen too |
| `mvnw: Permission denied` | `chmod +x backend/backend/backend/mvnw` |
| Port 8080 already in use | Stop the other process or set `PORT=8081` in `.env` and `VITE_PROXY_TARGET=http://localhost:8081` for the frontend |
| Everyone is logged out after a restart | Set a fixed `JWT_SECRET` in `.env` |
| Mail errors in the log | Leave `MAIL_ENABLED=false`, or fill in the SMTP settings |

## 6. Project layout
```
backend/backend/backend   Spring Boot app (controller, service, repository, entity, dto, config, exception, util)
  src/main/resources      application.properties (no secrets), questions.txt (question bank)
frontend/vite-project     React app: pages/, components/, context/, hooks/, utils/, api.js, styles.css
docs/                     API.md (every endpoint), BACKEND_SETUP.md, FEATURES.md (checklist)
scripts/                  setup-codespace.sh, run-backend.sh, run-frontend.sh, verify-backend.sh
```
