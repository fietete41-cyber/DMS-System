/* =============================================================================
   ตั้งค่าการเชื่อมต่อ Supabase
   -----------------------------------------------------------------------------
   1) สร้างโปรเจกต์ใหม่ที่ https://supabase.com/dashboard  (region: Southeast Asia)
   2) Project Settings → API → ก๊อป
        - Project URL           -> SUPABASE_URL
        - Project API keys: anon public -> SUPABASE_ANON_KEY
   3) Authentication → Providers → Email : เปิดใช้งาน
      Authentication → Sign In / Providers → ปิด "Confirm email"
      (เพราะผู้ใช้ล็อกอินด้วย username ไม่มีอีเมลจริง)
   4) รันไฟล์ supabase/schema.sql ใน SQL Editor ครั้งเดียว
   ค่าเหล่านี้เปิดเผยในหน้าเว็บได้ตามปกติ — ความปลอดภัยอยู่ที่ Row Level Security
   ============================================================================= */
window.SUPABASE_URL = "https://PASTE_PROJECT_REF.supabase.co";
window.SUPABASE_ANON_KEY = "PASTE_ANON_PUBLIC_KEY";

/* ผู้ใช้พิมพ์แค่ "username" ระบบต่อท้ายให้เป็น username@dms.local ก่อนส่งเข้า Supabase Auth */
window.AUTH_EMAIL_DOMAIN = "dms.local";

/* URL ของ Google Apps Script (Deploy เดิม) — คงไว้ใช้เฉพาะ "อัปโหลดไฟล์ขึ้น Drive"
   ต้องเพิ่มฟังก์ชัน uploadFile ใน GS DMS แล้ว Deploy เวอร์ชันใหม่ (ดู SUPABASE-SETUP.md) */
window.FILE_API_URL = "https://script.google.com/macros/s/PASTE_DEPLOY_ID/exec";
