# CareerPilot REST API (Phase 1)

Base URL: `http://localhost:8080` (the frontend will call `/api/...` through the Vite proxy).
All endpoints except register, login and health need the header `Authorization: Bearer <token>`.
Errors always look like: `{ "timestamp", "status", "error", "message", "fieldErrors": { "field": "problem" } | null }`.
Status codes used: 200, 201, 204, 400 (validation), 401 (not logged in / bad login / expired token),
404 (not found **or not yours**), 409 (duplicate email, interview already finished), 422 (no questions for settings).

## Auth and profile
| Method | Path | Body | Success |
|---|---|---|---|
| GET | `/api/health` | - | `{status:"UP"}` (public) |
| POST | `/api/users/register` | `{name,email,password}` (password: 8+ chars, a letter and a digit) | 201 `{message,user}` |
| POST | `/api/users/login` | `{email,password}` | 200 `{token,user}` (**changed**: was a plain string) |
| GET | `/api/users/me` | - | `{id,name,email,education,skills,targetRole,createdAt}` |
| PUT | `/api/users/me` | `{name,email,education,skills,targetRole}` | `{user,token}` (`token` only set if the email changed) |

## Interviews
| Method | Path | Notes |
|---|---|---|
| POST | `/api/interviews` | `{role,difficulty,interviewType,questionCount(1-30),timePerQuestionSeconds(15-600),focusTopics[]}` -> 201 `{interview,questions[],warning}`. Difficulty accepts Beginner/Intermediate/Advanced (or Easy/Medium/Hard). Type: Technical/HR/Behavioral/Mixed. Starting a new interview abandons any unfinished one. |
| GET | `/api/interviews/active` | Unfinished interview for session recovery (200) or 204. |
| GET | `/api/interviews/{id}` | `{interview, questions}` while in progress, `{interview, result}` when completed. |
| PUT | `/api/interviews/{id}/answers/{order}` | `{answerText,inputMethod:"SPEECH"|"TYPED",timeTakenSeconds}` -> `{order,answered}`. Blank text = skipped. |
| POST | `/api/interviews/{id}/complete` | Optional `{endedEarly, answers:[{order,answerText,inputMethod,timeTakenSeconds}]}` so the existing flow can send all answers at the end. Returns the full result. Safe to call twice. |
| GET | `/api/interviews` | History (completed). Query: `search, role, type, difficulty, sort=date|score, order=asc|desc, status`. |
| DELETE | `/api/interviews/{id}` | 204 |

Result: `{interview, evaluationMethod:"RULE_BASED_KEYWORD", evaluationNote, overallScore, answeredCount, totalQuestions, answers[], strengths[], improvements[], missingConcepts[{topic,concept}], recommendedTopics[], summary}`.
Each answer has `score, keywordScore, relevanceScore, completenessScore, clarityScore, fillerWordCount (speech only), matchedKeywords, missingKeywords, feedback, referenceAnswer`.
Unanswered questions score 0 and count towards the overall score.

## Dashboard and analytics
- `GET /api/dashboard` -> `{userName,totalInterviews,averageScore|null,bestScore|null,recentInterviews[],scoreTrend[],recommendedTopics[],activeInterviewId|null}`
- `GET /api/analytics` -> `{totalInterviews,scoreTrend[],byInterviewType[],byRole[],topics[],strengths[],weakAreas[],comparison|null,recommendations[],note}`

## Question bank, practice, bookmarks
- `GET /api/questions?role&topic&category&difficulty&search`, `GET /api/questions/meta`, `GET /api/questions/{id}` (detail includes key concepts and reference answer)
- `POST /api/practice/evaluate` `{questionId,answer,inputMethod}` -> evaluation (nothing saved)
- `GET /api/bookmarks`, `POST /api/bookmarks/{questionId}` (201 new / 200 existing), `DELETE /api/bookmarks/{questionId}` (204)
