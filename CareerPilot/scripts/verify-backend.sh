#!/usr/bin/env bash
# Quick API smoke test. Run while the backend is running:  bash scripts/verify-backend.sh
# It registers a throw-away user and walks through: login, interview, answer, complete, history, dashboard.
H="${1:-http://localhost:8080}"
PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then echo "PASS $1"; PASS=$((PASS+1)); else echo "FAIL $1 (expected $2, got $3)"; FAIL=$((FAIL+1)); fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json() { python3 -c "import sys,json;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1"; }

EMAIL="smoke$(date +%s)@example.com"
check "health" 200 "$(code $H/api/health)"
check "register (201)" 201 "$(code -X POST $H/api/users/register -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"Passw0rd1\"}")"
check "duplicate register (409)" 409 "$(code -X POST $H/api/users/register -H 'Content-Type: application/json' -d "{\"name\":\"Smoke Test\",\"email\":\"$EMAIL\",\"password\":\"Passw0rd1\"}")"
check "weak password (400)" 400 "$(code -X POST $H/api/users/register -H 'Content-Type: application/json' -d '{"name":"X Y","email":"x@y.com","password":"short"}')"
check "wrong password (401)" 401 "$(code -X POST $H/api/users/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"nope\"}")"
LOGIN="$(curl -s -X POST $H/api/users/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"Passw0rd1\"}")"
TOKEN="$(echo "$LOGIN" | json "d['token']")"
check "login returns no password" "False" "$(echo "$LOGIN" | json "'password' in d['user']")"
A=(-H "Authorization: Bearer $TOKEN")
check "no token (401)" 401 "$(code $H/api/users/me)"
check "me" 200 "$(code $H/api/users/me "${A[@]}")"
check "dashboard has no fake average" "None" "$(curl -s $H/api/dashboard "${A[@]}" | json "d['averageScore']")"
SESSION="$(curl -s -X POST $H/api/interviews "${A[@]}" -H 'Content-Type: application/json' -d '{"role":"Java Developer","difficulty":"Beginner","interviewType":"Mixed","questionCount":4,"timePerQuestionSeconds":60,"focusTopics":[]}')"
ID="$(echo "$SESSION" | json "d['interview']['id']")"
check "interview has questions" "4" "$(echo "$SESSION" | json "len(d['questions'])")"
check "save answer" 200 "$(code -X PUT $H/api/interviews/$ID/answers/1 "${A[@]}" -H 'Content-Type: application/json' -d '{"answerText":"I am a student who builds Java projects and I know SQL and teamwork skills.","inputMethod":"TYPED","timeTakenSeconds":30}')"
check "complete" 200 "$(code -X POST $H/api/interviews/$ID/complete "${A[@]}" -H 'Content-Type: application/json' -d '{"endedEarly":true}')"
check "history has 1 interview" "1" "$(curl -s "$H/api/interviews" "${A[@]}" | json "len(d)")"
check "analytics" 200 "$(code $H/api/analytics "${A[@]}")"
check "question bank loaded (>50)" "True" "$(curl -s $H/api/questions "${A[@]}" | json "len(d)>50")"
# a second user must not see the first user's interview
EMAIL2="smoke2$(date +%s)@example.com"
curl -s -o /dev/null -X POST $H/api/users/register -H 'Content-Type: application/json' -d "{\"name\":\"Other User\",\"email\":\"$EMAIL2\",\"password\":\"Passw0rd1\"}"
TOKEN2="$(curl -s -X POST $H/api/users/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL2\",\"password\":\"Passw0rd1\"}" | json "d['token']")"
check "other user cannot open the interview (404)" 404 "$(code $H/api/interviews/$ID -H "Authorization: Bearer $TOKEN2")"
echo; echo "Result: $PASS passed, $FAIL failed"; [ "$FAIL" = 0 ]
