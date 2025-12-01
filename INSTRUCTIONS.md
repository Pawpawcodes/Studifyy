
# Studify - Supabase Integration Instructions

## 1. Environment Variables
Add these to your `.env` file (local) and Supabase Dashboard (for Edge Functions).

### Frontend (.env)
```
REACT_APP_SUPABASE_URL=https://<project-id>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<your-anon-key>
API_KEY=<your-gemini-api-key>
```

### Edge Functions (.env or via CLI)
```
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

## 2. Google OAuth Setup
1. Go to **Supabase Dashboard > Authentication > Providers > Google**.
2. Enable Google.
3. Go to **Google Cloud Console > API & Services > Credentials**.
4. Create **OAuth 2.0 Client ID**.
   - Authorized Origins: `https://<project-id>.supabase.co`, `http://localhost:3000`
   - Authorized Redirect URIs: `https://<project-id>.supabase.co/auth/v1/callback`
5. Copy `Client ID` and `Client Secret` to Supabase Dashboard.
6. **IMPORTANT**: Add `http://localhost:3000/auth/v1/callback` to **Supabase Authentication > URL Configuration > Redirect URLs**.

## 3. Database & Storage Setup
1. Copy the content of `supabase_schema.sql`.
2. Go to **Supabase Dashboard > SQL Editor**.
3. Paste and run the script. This creates tables, RLS policies, and storage buckets.

## 4. Deploy Edge Functions
Prerequisite: Install Supabase CLI.

1. Login: `supabase login`
2. Deploy functions:
```bash
supabase functions deploy process-upload
supabase functions deploy generate-tts
```
3. Set Secrets:
```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

## 5. Test Plan
1. **Login**: Go to `/login`, click "Sign in with Google". Verify you land on Dashboard.
2. **Profile**: Check `profiles` table in Supabase. A new row should exist for your user.
3. **Upload**: Go to `/uploads`, upload a PDF. 
   - Verify file appears in `storage/buckets/uploads`.
   - Verify metadata in `uploads` table.
   - Verify text chunks in `doc_chunks` table (after ~5-10s).
4. **TTS**: Go to `/explain`, generate text, click Listen.
   - First click: Should take ~2s (generating).
   - Reload page, click Listen again: Should be instant (cached from `tts_cache` + `storage/buckets/tts`).
