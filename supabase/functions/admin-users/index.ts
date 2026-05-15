import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_API_TOKEN")!;

const extraHeaders = {
  ...corsHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...extraHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: extraHeaders });

  const token = req.headers.get("x-admin-token");
  if (!token || !ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  // path looks like /admin-users/<action>
  const action = url.pathname.split("/").filter(Boolean).pop();

  let body: any = {};
  if (req.method !== "GET") {
    try { body = await req.json(); } catch { body = {}; }
  }

  try {
    switch (action) {
      case "list": {
        const page = body.page ?? 1;
        const perPage = body.perPage ?? 1000;
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        return json(data);
      }
      case "get": {
        const { email } = body;
        if (!email) return json({ error: "email required" }, 400);
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) throw error;
        const user = data.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
        return json({ user: user ?? null });
      }
      case "create": {
        const { email, password, user_metadata, email_confirm = true } = body;
        if (!email || !password) return json({ error: "email and password required" }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email, password, email_confirm, user_metadata,
        });
        if (error) throw error;
        return json(data);
      }
      case "reset-password": {
        const { user_id, password } = body;
        if (!user_id || !password) return json({ error: "user_id and password required" }, 400);
        const { data, error } = await admin.auth.admin.updateUserById(user_id, { password });
        if (error) throw error;
        return json(data);
      }
      case "confirm-email": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const { data, error } = await admin.auth.admin.updateUserById(user_id, { email_confirm: true });
        if (error) throw error;
        return json(data);
      }
      case "delete": {
        const { user_id } = body;
        if (!user_id) return json({ error: "user_id required" }, 400);
        const { data, error } = await admin.auth.admin.deleteUser(user_id);
        if (error) throw error;
        return json(data);
      }
      default:
        return json({ error: "unknown action", action }, 404);
    }
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
