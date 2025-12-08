# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

- Install dependencies

```bash path=null start=null
npm install
```

- Start the Vite dev server (port configured to 3000, host `0.0.0.0` in `vite.config.ts`). After starting it, open `http://localhost:3000/` in your browser to view the app (the main dashboard is at `http://localhost:3000/#/`).

```bash path=null start=null
npm run dev
```

- Build the production bundle (also used by Netlify via `netlify.toml`)

```bash path=null start=null
npm run build
```

- Preview the production build locally

```bash path=null start=null
npm run preview
```

### Environment configuration

The app relies on client-side environment variables (Vite-style) for Gemini and Supabase:

- `VITE_GEMINI_API_KEY` – used in `services/geminiService.ts` and wired via `vite.config.ts`.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` – used in `supabaseClientFrontend.ts`.

Place these in an environment file that Vite loads for the desired mode (for local development, `.env.local` is commonly used alongside this repo’s existing `.env` / `.env.local`).

> Note: the README mentions `GEMINI_API_KEY`; the actual runtime code expects `VITE_GEMINI_API_KEY`.

There is no configured Node-based test or lint command in `package.json`. Any test or lint tooling you add will need corresponding scripts before it can be run via npm.

## High-level architecture

This is a Vite + React TypeScript single-page app that combines Google Gemini and Supabase to provide a personalized multi-tool study assistant (“Studify”).

### Entry point, routing, and layout

- `index.tsx` bootstraps React and wraps `App` in a `BrowserRouter`.
- `App.tsx` then uses a nested `HashRouter` plus `Routes` from `react-router-dom` to define the actual in-app routes. This allows Netlify-style static hosting while keeping hash-based navigation stable.
- Global providers are composed at the top level in `App`:
  - `AuthProvider` (`context/AuthContext.tsx`) – Supabase auth session, Google OAuth sign-in/out, and a `loading` flag.
  - `StoreProvider` (`context/StoreContext.tsx`) – application state and personalization.
  - `AudioProvider` (`context/AudioContext.tsx`) – shared audio playback instance for TTS.
- `components/Layout.tsx` is the main shell (sidebar, navigation, header, reset control) used for all authenticated pages. It drives navigation via `react-router-dom` and reads basic user info from `StoreContext` for display.
- Route structure in `App.tsx`:
  - Public: `/landing`, `/login`, `/auth/v1/callback`.
  - Protected (wrapped in `ProtectedRoute` which checks `useAuth().session`): `/` (Dashboard), `/explain`, `/quiz`, `/flashcards`, `/doubt`, `/plan`, `/uploads`, `/settings`.
  - Hidden diagnostics route: `/test` (see **Diagnostics & system tests** below).
  - Catch-all redirects to `/` or `/landing` based on auth state.

### Global state & personalization

- `types.ts` defines the core domain model:
  - `UserProfile` (education level, subjects, weak/strong topics, streak, study hours, performance history),
  - `AppState` (user, session, uploaded files, flashcards, quizzes, study plan, onboarding status),
  - quiz/flashcard structures and AI response types.
- `StoreContext.tsx` is the central client-side “store”:
  - Initializes from `localStorage` key `studify_state` and persists the full `AppState` on every change.
  - Exposes helpers: `updateUser`, `toggleAutoPlay`, `addFile`, `addQuiz`, `addFlashcards`, `setPlan`, `completeOnboarding`, `resetData`, `recordPerformance`.
  - `recordPerformance` updates a per-topic performance history and dynamically moves topics between `weakTopics` and `strongTopics` based on rolling average scores.
- `Onboarding.tsx` and `Settings.tsx` mutate `UserProfile` (name, education level, subjects, auto-play preference) through these helpers.

### Authentication and Supabase integration

- `supabaseClientFrontend.ts` creates a browser Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and logs when they are missing.
- `context/AuthContext.tsx`:
  - On mount, calls `supabase.auth.getSession()` and sets up `onAuthStateChange` to keep `session` in sync.
  - Exposes `googleSignIn` using `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`, where `redirectTo` is computed to play nicely with the `HashRouter` (`/#/login`).
  - Exposes `signOut` via `supabase.auth.signOut()`.
- `components/AuthBar.tsx` is an additional, simpler auth strip that also interacts with Supabase for sign-in/out and greets the current user in the UI.
- `services/supabaseService.ts` encapsulates backend-facing Supabase operations:
  - `uploadFileToStorage` uploads to the `uploads` storage bucket, inserts metadata into the `uploads` table, invokes the `process-upload` Edge Function, then returns a local `UploadedFile` representation with a short-lived signed URL.
  - `fetchUserProfile` reads from the `profiles` table and maps it into the `UserProfile` shape used by the client.
  - `fetchTTS` calls a Supabase Edge Function `generate-tts` and returns an audio URL, used as an alternate TTS path.

### AI orchestration (Gemini) and study tools

- `services/geminiService.ts` centralizes all Gemini calls using `@google/generative-ai`:
  - Initializes a shared `GoogleGenerativeAI` client from `import.meta.env.VITE_GEMINI_API_KEY`.
  - `orchestrateRequest` – main chat-style orchestrator used by `components/ChatWidget.tsx`.
    - Builds a prompt containing serialized `UserProfile`, conversation history, question, and any uploaded files (converted into Gemini `inlineData`).
  - `explainTopic` – topic explanation API used by `pages/Explain.tsx`.
  - `solveDoubt` – question/solution API used by `pages/Doubt.tsx`.
  - `generateQuiz` – returns a JSON quiz for a topic + difficulty, used by `pages/Quiz.tsx`.
  - `generateFlashcards` – returns a JSON flashcard set, augmented client-side with IDs and initial `nextReview` timestamps, used by `pages/Flashcards.tsx`.
  - `generateStudyPlan` – creates a 7-day JSON study plan used by `pages/Planner.tsx`.
  - `generateTTS` – calls Gemini’s REST TTS endpoint, returns a Blob-based `audio/wav` object URL used by the shared audio system.
- Core pages built on these services and the global store:
  - `Dashboard.tsx` – high-level overview of streak, goals, flashcard count, recent quizzes, and quick links.
  - `Explain.tsx` – topic explainer; shows a markdown-rendered explanation plus optional external sources, uses `TTSPlayer` to read AI output.
  - `Doubt.tsx` – file-centric “ask a doubt” workflow; uploads PDFs/images to Supabase, stores local `UploadedFile` entries, and calls `solveDoubt` over all known files.
  - `Quiz.tsx` – quiz runner; calls `generateQuiz`, drives a multi-question UI, records results back into the store and `recordPerformance`.
  - `Flashcards.tsx` – flashcard review and generation; uses `generateFlashcards`, tracks ease/difficulty feedback per card via `recordPerformance`.
  - `Planner.tsx` – weekly study plan; auto-generates a plan on first load using current weak topics and can be regenerated on demand.

### Chat, audio, and TTS pipeline

- `components/ChatWidget.tsx` is a floating chat assistant:
  - Maintains a message list (user/AI) and streams conversation history into `orchestrateRequest` for context.
  - Renders AI responses with `ReactMarkdown` and optional source links.
  - Integrates browser speech recognition (where available) for voice input and uses `TTSPlayer` to read AI messages aloud.
- `context/AudioContext.tsx` implements a single global `HTMLAudioElement` instance and exposes `play`, `pause`, `resume`, and `stop`, along with `currentId` and `isPlaying`.
- `components/TTSPlayer.tsx` (and a very similar implementation under `context/TTSPlayer.tsx`) wraps `generateTTS` + `AudioContext`:
  - Generates audio once per text snippet and reuses the URL for subsequent plays.
  - Supports both a minimal icon-only control and a fuller control bar with stop and download options.
  - Honors `autoPlay` props and the user’s `autoPlayAudio` preference from the store to optionally auto-start audio.

### Diagnostics & system tests

- `pages/TestSuite.tsx` exposes an in-app “System Diagnostics” page mounted at the `/test` route.
  - Runs a series of end-to-end checks over Gemini TTS, the orchestrator agent, and file context, and synthesizes a `TestReport` summarizing pass/fail/warn status.
  - This is UI-driven rather than CLI-driven; there is no npm script to run it from the terminal. To exercise it, start the dev server and navigate to `/#/test`.

## Deployment notes

- `netlify.toml` configures deployment via Netlify:
  - Build command `npm run build`, publish directory `dist`.
  - A catch-all redirect from `/*` to `/index.html` (status 200) to support SPA routing.
  - Netlify secrets scanning is disabled for this build to avoid warnings about Vite public env vars.
