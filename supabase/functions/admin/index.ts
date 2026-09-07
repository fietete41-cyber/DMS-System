// =============================================================================
// Edge Function: admin  — จัดการบัญชีผู้ใช้ (ต้องเป็นแอดมินเท่านั้น)
// action: createUser | updateUser | resetPassword | deleteUser | importUsers
// เรียกจากหน้าเว็บด้วย supabase.functions.invoke('admin', { body: {...} })
// Deploy: Dashboard → Edge Functions → Deploy a new function → ชื่อ "admin"
//         วางโค้ดนี้ทั้งไฟล์ แล้วกด Deploy  (ไม่ต้องตั้งค่า secret เพิ่ม)
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL_DOMAIN = "dms.local";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// คืน HTTP 200 เสมอสำหรับผลลัพธ์เชิงธุรกิจ (ทั้ง success/error) เพื่อให้ฝั่งเว็บอ่านง่าย
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const emailFor = (u: string) => `${String(u).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ---- ตรวจสิทธิ์ผู้เรียก: ต้องล็อกอิน และ role = admin ----
  const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: caller } = await admin.auth.getUser(jwt);
  if (!caller?.user) return json({ status: "error", message: "ไม่ได้ล็อกอิน" });

  const { data: me } = await admin
    .from("users").select("username, role, status").eq("id", caller.user.id).single();
  if (!me || me.role !== "admin" || me.status === "Inactive") {
    return json({ status: "error", message: "ต้องเป็นผู้ดูแลระบบเท่านั้น" });
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ status: "error", message: "รูปแบบคำขอไม่ถูกต้อง" }); }
  const action = body?.action;

  try {
    // ---------------------------------------------------------------- createUser
    if (action === "createUser") {
      const { username, password, name, role } = body;
      if (!username || !password) return json({ status: "error", message: "ต้องมี username และรหัสผ่าน" });

      const dup = await admin.from("users").select("id").eq("username", String(username).trim()).maybeSingle();
      if (dup.data) return json({ status: "error", message: "Username มีในระบบแล้ว" });

      const created = await admin.auth.admin.createUser({
        email: emailFor(username), password: String(password), email_confirm: true,
      });
      if (created.error) return json({ status: "error", message: created.error.message });

      const ins = await admin.from("users").insert({
        id: created.data.user.id,
        username: String(username).trim(),
        name: name || "",
        role: role === "admin" ? "admin" : "user",
        status: "Active",
      });
      if (ins.error) {
        await admin.auth.admin.deleteUser(created.data.user.id); // rollback
        return json({ status: "error", message: ins.error.message });
      }
      return json({ status: "success" });
    }

    // ---------------------------------------------------------------- updateUser
    if (action === "updateUser") {
      const { id, name, role, status, password } = body;
      if (!id) return json({ status: "error", message: "ต้องระบุ id" });
      const upd = await admin.from("users")
        .update({ name: name ?? undefined, role: role ?? undefined, status: status ?? undefined })
        .eq("id", id);
      if (upd.error) return json({ status: "error", message: upd.error.message });
      if (password) {
        const p = await admin.auth.admin.updateUserById(id, { password: String(password) });
        if (p.error) return json({ status: "error", message: p.error.message });
      }
      return json({ status: "success" });
    }

    // -------------------------------------------------------------- resetPassword
    if (action === "resetPassword") {
      const { id, password } = body;
      if (!id || !password) return json({ status: "error", message: "ต้องระบุ id และรหัสผ่านใหม่" });
      const p = await admin.auth.admin.updateUserById(id, { password: String(password) });
      if (p.error) return json({ status: "error", message: p.error.message });
      return json({ status: "success" });
    }

    // ---------------------------------------------------------------- deleteUser
    if (action === "deleteUser") {
      const { id } = body;
      if (!id) return json({ status: "error", message: "ต้องระบุ id" });
      if (id === caller.user.id) return json({ status: "error", message: "ลบบัญชีตัวเองไม่ได้" });
      await admin.from("users").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
      return json({ status: "success" });
    }

    // -------------------------------------------------------------- importUsers
    if (action === "importUsers") {
      const rows: any[] = Array.isArray(body.users) ? body.users : [];
      const existing = new Set(
        ((await admin.from("users").select("username")).data || []).map((r: any) => String(r.username).toLowerCase()),
      );
      let inserted = 0;
      for (const u of rows) {
        const uname = String(u.username || "").trim();
        if (!uname || existing.has(uname.toLowerCase()) || !u.password) continue;
        const c = await admin.auth.admin.createUser({
          email: emailFor(uname), password: String(u.password), email_confirm: true,
        });
        if (c.error) continue;
        const ins = await admin.from("users").insert({
          id: c.data.user.id, username: uname, name: u.name || "",
          role: u.role === "admin" ? "admin" : "user", status: "Active",
        });
        if (ins.error) { await admin.auth.admin.deleteUser(c.data.user.id); continue; }
        existing.add(uname.toLowerCase());
        inserted++;
      }
      return json({ status: "success", inserted });
    }

    return json({ status: "error", message: "ไม่รู้จัก action" });
  } catch (e) {
    return json({ status: "error", message: (e as Error).message || String(e) }, 500);
  }
});
