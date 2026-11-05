# xor

**Study together. Soar together.**

xor is a study app for you and your friends. Make a private room, upload lecture PDFs, and xor uses AI to turn them into flashcards and quizzes. Everyone in the room can take the quizzes, get AI feedback, and compete on leaderboards.

Built with Next.js, Supabase, and Google Gemini. It installs on phones as an app (PWA).

## Features

- **Accounts:** email + password, or Sign in with Google. Everyone picks a username.
- **Private rooms:** each room gets a secret key like `XOR-7F3K-9QPA`. Only the owner can see it.
- **Owner controls:** remove members, delete any upload, make a new key if it leaks, rename or delete the room.
- **PDF uploads:** up to 50 MB. The AI reads text *and* images, so slides, diagrams and tables work. Members can delete only their own uploads.
- **Flashcards:** pick the materials, card count, difficulty and an optional focus. Flip cards, shuffle, and track "I know this" or "Still learning".
- **Quizzes:** 8 question types (multiple choice, true or false, identification, fill in the blank, enumeration, matching, scenario-based, essay), 4 difficulty levels, and an optional time limit.
- **AI grading:** written answers get partial credit and feedback. After submitting, you see the correct answers and explanations.
- **Leaderboards:** each quiz has its own leaderboard, and each room has an overall one (total points from first attempts). Only your **first** attempt counts. Retakes are unlimited practice.
- **Leaderboard reset:** the owner starts a vote, and the scores reset only if more than half of the members agree.
- **Installable app:** add it to your phone's home screen from the browser (Android and iPhone).

## Setup guide

You'll need four free accounts: **GitHub**, **Supabase**, **Google AI Studio**, and **Vercel**. Setup takes about 30 minutes.

### 1. Supabase (database, logins, file storage)

1. Go to [supabase.com](https://supabase.com) → **New project**.
   - Name: `xor`
   - Region: **Southeast Asia (Singapore)**, the closest region to the Philippines.
   - Save the database password somewhere safe.
2. When the project is ready, open **SQL Editor → New query**. Paste everything from [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You should see "Success". This creates all tables, security rules, and the PDF storage bucket.
3. Open **Project Settings → API** and copy these three values for later:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**secret, never share it or put it in code**)
4. Open **Storage → Settings** and check that the global file size limit is **50 MB**.

### 2. Google AI Studio (the free AI)

1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API key** → **Create API key**.
2. Copy it. That's `GEMINI_API_KEY`. It's secret, so don't post it anywhere.

> `GEMINI_MODEL=gemini-flash-latest` always uses Google's current Flash model. You can set a specific model name instead if you prefer.

### 3. Run it on your computer (optional, but good for testing)

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values from steps 1–2
npm run dev
```

Open http://localhost:3000. Email sign-up works right away. Google sign-in needs step 6.

### 4. Push to GitHub

Create a new **empty** repository on GitHub (for example, `xor`). Then, in the project folder:

```bash
git init        # skip if the folder already has a .git folder
git add .
git commit -m "xor: first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/xor.git
git push -u origin main
```

`.env.local` is ignored by git, so your secret keys stay on your computer.

### 5. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import your `xor` repo.
2. Under **Environment Variables**, add every key from `.env.example` with your real values. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL (you can update it after the first deploy).
3. Click **Deploy**. You'll get a URL like `https://xor-yourname.vercel.app`.
4. Back in Supabase, go to **Authentication → URL Configuration**:
   - **Site URL:** your Vercel URL
   - **Redirect URLs:** add `https://YOUR-APP.vercel.app/**` and `http://localhost:3000/**`

From now on, every `git push` redeploys the site automatically.

### 6. Turn on "Sign in with Google"

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name (`xor`) and your email, and publish it.
2. Go to **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized redirect URI:** `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (Supabase shows this exact URL in the next step).
3. Copy the **Client ID** and **Client secret**.
4. In Supabase, go to **Authentication → Sign In / Providers → Google**. Turn it on, paste both values, and save.

### 7. Install on your phone

Open your Vercel URL on your phone:
- **Android (Chrome):** menu ⋮ → **Install app** (or **Add to Home screen**).
- **iPhone (Safari):** Share → **Add to Home Screen**.

## Free-tier limits

- **Gemini free tier:** limits are counted per Google project, so everyone using your app shares one quota. To keep one person from using it all, xor sets daily per-user limits. Change them with `DAILY_LIMIT_PROCESS` (PDF uploads), `DAILY_LIMIT_GENERATE` (quizzes and flashcard decks), and `DAILY_LIMIT_GRADE` (quiz submissions with written answers). Ranked first attempts are always AI-graded. On the free tier, Google may use the content you send to improve its products. If the app grows, enable billing on the Gemini key and nothing else needs to change.
- **Supabase free plan:** 1 GB of file storage (about 20–40 big PDFs) and a 50 MB maximum file size. Free projects **pause after 1 week with no activity**. If that happens, open the Supabase dashboard and click **Restore**. To free up space, delete old PDFs from the Materials tab. Quizzes and decks made from them stay.
- **Vercel Hobby:** AI jobs are allowed up to 5 minutes. A 100-page PDF usually takes 1–3 minutes to read.

## How leaderboards work

- Each quiz leaderboard ranks everyone's **first attempt** by score (ties go to whoever finished first).
- The room leaderboard adds up first-attempt points across all quizzes, so taking more quizzes and scoring higher both move you up.
- Retakes are graded and saved in your history, but they're marked as practice.
- A reset starts a new "season": the boards go to zero, and everyone's next attempt at each quiz counts again. Old attempts stay in each person's history.

## Project structure

```
app/
  page.tsx                     landing page
  login, signup, forgot, reset-password, onboarding, auth/callback
  rooms/                       your rooms + create/join
  rooms/[id]/                  materials (room home)
    flashcards/                decks, new deck, study view
    quizzes/                   list, new quiz, quiz page, take, results
    leaderboard/               room leaderboard + reset vote
    members/                   members, secret key, room settings
  api/                         server routes that call the AI or need admin access
lib/
  ai/gemini.ts                 PDF reading, flashcards, quiz generation, grading
  questions.ts                 question types and scoring
  limits.ts                    daily per-user AI limits
  supabase/                    Supabase clients
supabase/schema.sql            database, security rules, leaderboard functions
public/sw.js                   service worker (installable app + offline page)
```

## Security notes

- Every table has Row Level Security: you can only read rooms you're a member of.
- Quiz answers are stored in a table the browser can't read. Answers are revealed only on your results page after you submit.
- The room key column is hidden from everyone except the owner (through `get_room_key`).
- Wrong key guesses are rate-limited (8 per 10 minutes).
- The service role and Gemini keys are only used on the server.
