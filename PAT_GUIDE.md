
🔑 CARA DAPATKAN GITHUB PERSONAL ACCESS TOKEN (PAT)

Step 1: Buka GitHub Settings
────────────────────────────
URL: https://github.com/settings/tokens

ATAU cara lain:
1. Login GitHub
2. Click profile picture (top right)
3. Click "Settings"
4. Scroll ke bawah, click "Developer settings" (left sidebar)
5. Click "Personal access tokens"
6. Click "Tokens (classic)"


Step 2: Generate New Token
──────────────────────────
1. Click button "Generate new token"
2. Pilih "Generate new token (classic)"

Note: Kalau ada 2FA enabled, GitHub akan minta verify dulu


Step 3: Configure Token
───────────────────────
Fill in the form:

📝 Note: "Work2U deployment" (atau apa-apa nama)

⏰ Expiration: Pilih "No expiration" atau "90 days"
   (kalau ada plan upgrade nanti, tukar)

📋 Scopes — CHECK INI:
   ☑️ repo (Full control of private repositories)
       ☑️ repo:status
       ☑️ repo_deployment
       ☑️ public_repo
       ☑️ repo:invite
       ☑️ security_events
   ☑️ workflow (optional - kalau nak GitHub Actions)
   
   JUST "repo" SUFFICIENT!


Step 4: Generate & Copy
────────────────────────
1. Scroll bawah, click "Generate token" (hijau)
2. ⚠️ PENTING: GitHub hanya tunjuk token SEKALI!
3. Copy token immediately (contoh: ghp_xxxxxxxxxxxxxxxxxxxx)
4. Save dalam notepad atau password manager

Token format: ghp_1a2b3c4d5e6f7g8h9i0j...


Step 5: Beri Token Pada Saya
─────────────────────────────
Format: ghp_xxxxxxxxxxxxxxxxxxxx

Saya akan:
- Save securely (temporary)
- Push code to repo
- Token NOT saved in any permanent location
- Used sekali sahaja

Atau kalau Abang nak push sendiri, run command:
git push https://USERNAME:ghp_TOKEN@github.com/USERNAME/work2u-whatsapp-service.git main
