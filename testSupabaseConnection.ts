// RUN WITH:
// npx ts-node testSupabaseConnection.ts

import { supabase } from './supabaseClientNode';  // FIXED IMPORT

async function testNodeConnection() {
  console.log("🔍 Testing Supabase (Node) Connection...");

  try {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .limit(1);

    if (error) {
      console.error("❌ Node Connection Failed:");
      console.error(error);
      return;
    }

    console.log("✅ Node Connection Successful!");
    console.log("Returned data:", data);
  } catch (err) {
    console.error("❌ Unexpected Error:", err);
  }
}

testNodeConnection();
