import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://acusbxljzugtseljkxcb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdXNieGxqenVndHNlbGpreGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Nzc3OTcsImV4cCI6MjA3NjE1Mzc5N30.zPu5Zzxp9otmR9uXHrHFt3ZjfRQcbdS5IpiQtxT1ry0'; // ⚠️ keep this secret, never commit to GitHub

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function makeAdmin() {
  const userId = '65aeadf2-7ecf-4b3f-8f63-21dbab702bae';
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin' },
  });

  if (error) {
    console.error('❌ Failed to update:', error);
  } else {
    console.log('✅ Updated successfully:', data);
  }
}

makeAdmin();
