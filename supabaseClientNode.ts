import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Supabase Client for Node.js Backend
 *
 * WARNING: If using the SERVICE_ROLE key here, ensure this file is never
 * bundled or sent to the client/browser.
 */

// HARDCODED URL AS REQUESTED
const supabaseUrl = "https://wkefepwnztesbjdyqybp.supabase.co";

// READ KEY FROM PROCESS.ENV
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  throw new Error("Missing SUPABASE_KEY in environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
