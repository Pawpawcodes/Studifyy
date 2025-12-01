# Deployment Environment Variables Reference

When deploying to Vercel, Netlify, or other CI/CD platforms, configure the following variables in their respective dashboards.

### 1. Frontend Public Variables (Exposed to Browser)

| Variable Name | Description | Value Source |
| :--- | :--- | :--- |
| `VITE_API_KEY` | Gemini API Key | Google AI Studio |
| `REACT_APP_API_KEY` | Gemini API Key (Legacy Support) | Google AI Studio |
| `VITE_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard > API |
| `REACT_APP_SUPABASE_URL` | Supabase Project URL | Supabase Dashboard > API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Anon Key | Supabase Dashboard > API |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase Public Anon Key | Supabase Dashboard > API |

### 2. Backend Private Variables (Supabase Edge Functions)

These must be set using the Supabase CLI command:
`supabase secrets set KEY=VALUE`

| Variable Name | Description | Value Source |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Gemini API Key for Backend | Google AI Studio |
| `SUPABASE_URL` | Supabase Project URL | Supabase Dashboard > API |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** Admin Key | Supabase Dashboard > API |
| `SUPABASE_ANON_KEY` | Public Anon Key | Supabase Dashboard > API |
