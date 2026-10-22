# Backend setup and verification (Phase 1)

> **Status: written and reviewed, NOT yet compiled or run.** The build sandbox had no internet, Maven or MySQL.
> Run the checklist below once in GitHub Codespaces and tell me about any error message.

## 1. Change your exposed MySQL password (do this first)
The original `application.properties` contained a real password. Anyone who has the ZIP or the GitHub repo history can read it.
1. Pick a **new** password and set it in MySQL (replace the placeholder; never paste the old one anywhere):
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'a-new-strong-password';
   ```
   Better: stop using root for the app and create a dedicated user:
   ```sql
   CREATE DATABASE IF NOT EXISTS careerpilot_db;
   CREATE USER 'careerpilot'@'localhost' IDENTIFIED BY 'a-new-strong-password';
   GRANT ALL PRIVILEGES ON careerpilot_db.* TO 'careerpilot'@'localhost';
   ```
2. If the project is on GitHub, the old password is still in the git history. Changing it (step 1) makes the leaked one useless.
   Also make the repository private, or rewrite history with `git filter-repo`.
3. Put the new password only in `backend/.../.env` (git-ignored). Do not put it in code, chat or screenshots.

## 2. Configure
```bash
cd backend/backend/backend
cp .env.example .env
openssl rand -base64 48        # copy the output into JWT_SECRET= in .env
nano .env                      # set DB_USERNAME, DB_PASSWORD, JWT_SECRET
```
If `JWT_SECRET` is empty the server still starts with a temporary random key (users must log in again after every restart).
Tables are created automatically (`ddl-auto=update`: adds tables/columns, never deletes data). The existing `users` table only gains new nullable columns.
The 91-question bank is inserted automatically on first start.

## 3. Run in GitHub Codespaces
Shortcut: `bash scripts/setup-codespace.sh` does steps 1-2 and the MySQL part of this step for you (random password, written only to `.env`). The manual commands follow.

```bash
# MySQL (option A: install in the codespace)
sudo apt-get update && sudo apt-get install -y mysql-server
sudo service mysql start
sudo mysql -e "CREATE DATABASE IF NOT EXISTS careerpilot_db; CREATE USER IF NOT EXISTS 'careerpilot'@'localhost' IDENTIFIED BY 'a-new-strong-password'; GRANT ALL ON careerpilot_db.* TO 'careerpilot'@'localhost';"
# (option B: docker run -d --name cp-mysql -e MYSQL_ROOT_PASSWORD=a-new-strong-password -e MYSQL_DATABASE=careerpilot_db -p 3306:3306 mysql:8  -> then DB_USERNAME=root)

cd backend/backend/backend
java -version                  # needs 17 or newer
./mvnw test                    # unit tests, no database needed
./mvnw spring-boot:run         # wait for "Question bank ready: 91 new question(s) added"
```

## 4. Verification checklist (second terminal)
```bash
H=http://localhost:8080
curl -s $H/api/health                                                    # {"status":"UP",...}
curl -s -X POST $H/api/users/register -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","password":"Passw0rd1"}'   # 201, no password in output
curl -s -X POST $H/api/users/register -H 'Content-Type: application/json' \
  -d '{"name":"T","email":"bad","password":"short"}'                            # 400 with fieldErrors
curl -s -X POST $H/api/users/login -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"wrong"}'                          # 401
TOKEN=$(curl -s -X POST $H/api/users/login -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Passw0rd1"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s $H/api/users/me                                                   # 401 (no token)
curl -s $H/api/users/me -H "Authorization: Bearer $TOKEN"                 # profile
curl -s $H/api/dashboard -H "Authorization: Bearer $TOKEN"                # averageScore null, 0 interviews
curl -s -X POST $H/api/interviews -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"role":"Java Developer","difficulty":"Beginner","interviewType":"Mixed","questionCount":5,"timePerQuestionSeconds":60,"focusTopics":[]}'
# note the interview "id" (call it 1), then:
curl -s -X PUT $H/api/interviews/1/answers/1 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"answerText":"I am a final year computer science student who builds Java and React projects and I want to work as a developer.","inputMethod":"TYPED","timeTakenSeconds":40}'
curl -s -X POST $H/api/interviews/1/complete -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"endedEarly":true}'
curl -s "$H/api/interviews?sort=score" -H "Authorization: Bearer $TOKEN"  # history
curl -s $H/api/analytics -H "Authorization: Bearer $TOKEN"
curl -s "$H/api/questions?topic=SQL" -H "Authorization: Bearer $TOKEN"
```
Isolation test: register a second user, log in, then `GET /api/interviews/1` with the second token must return **404**.
