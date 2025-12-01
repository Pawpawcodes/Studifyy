# Supabase Integration Setup

## 1. Environment Setup
Create a file named `.env` in your project root and add your Supabase Key.

```env
# For Backend (Node.js)
SUPABASE_KEY=your_anon_key_here

# For Frontend (Vite)
VITE_SUPABASE_KEY=your_anon_key_here
```

**⚠️ SECURITY WARNING:**
- If you are using this in a **Frontend (React/Vite)** app, `SUPABASE_KEY` must be your **ANON (Public)** key.
- If you are using this in a **Backend (Node.js)** script, you may use the **SERVICE_ROLE** key, but ensure that code is never exposed to the browser.

## 2. Using the Client

### In Node.js (Backend)
Use `supabaseClientNode.ts`. It utilizes `dotenv` to load `process.env.SUPABASE_KEY`.

```typescript
import supabase from './supabaseClientNode';
```

### In React/Vite (Frontend)
Use `supabaseClientFrontend.ts`. It maps `import.meta.env.VITE_SUPABASE_KEY` to the `supabaseKey` variable.

```typescript
import supabase from './supabaseClientFrontend';
```

## 3. Testing the Connection
To verify your credentials and URL are working:

1. Ensure dependencies are installed:
   ```bash
   npm install dotenv @supabase/supabase-js
   npm install -D ts-node typescript
   ```

2. Run the test script:
   ```bash
   npx ts-node testSupabaseConnection.ts
   ```

3. Check the console output for a `✅ Connection Successful!` message.
