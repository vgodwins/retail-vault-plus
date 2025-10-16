import { createClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = "https://acusbxljzugtseljkxcb.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdXNieGxqenVndHNlbGpreGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Nzc3OTcsImV4cCI6MjA3NjE1Mzc5N30.zPu5Zzxp9otmR9uXHrHFt3ZjfRQcbdS5IpiQtxT1ry0";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function ensureRoleExists(role: string) {
  console.log(`🔍 Checking if role "${role}" exists in database...`);
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("name", role)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking role:", error.message);
    return null;
  }

  if (!data) {
    console.log(`⚙️ Role "${role}" not found — creating it...`);
    const { error: insertError } = await supabase.from("roles").insert([{ name: role }]);
    if (insertError) {
      console.error("Error creating role:", insertError.message);
      return null;
    }
    console.log(`✅ Role "${role}" created successfully.`);
  } else {
    console.log(`✅ Role "${role}" already exists.`);
  }

  return role;
}

async function setUserRole(email: string, role: string) {
  console.log(`\n🎯 Setting role for: ${email}`);
  await ensureRoleExists(role);

  // Get all users
  const { data: userList, error: fetchError } = await supabase.auth.admin.listUsers();

  if (fetchError) {
    console.error("Error fetching users:", fetchError.message);
    return;
  }

  // ✅ Explicitly type as User[]
  const users = userList.users as User[];

  const user = users.find((u) => u.email === email);
  if (!user) {
    console.error(`❌ User with email ${email} not found.`);
    return;
  }

  // Update Auth user metadata
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { role },
  });

  if (updateError) {
    console.error("Error updating user metadata:", updateError.message);
    return;
  }

  console.log(`✅ Auth metadata updated for ${email} to role: ${role}`);

  // Update or insert user role in the database
  const { error: dbError } = await supabase
    .from("user_roles")
    .upsert({ email, role }, { onConflict: "email" });

  if (dbError) {
    console.error("Error updating role in database:", dbError.message);
  } else {
    console.log(`✅ Role "${role}" saved in user_roles table for ${email}`);
  }
}

// Get args from terminal
const [, , email, role] = process.argv;

if (!email || !role) {
  console.log("Usage: npx tsx scripts/setRole.ts <email> <role>");
  process.exit(1);
}

setUserRole(email, role);
