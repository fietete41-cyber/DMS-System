/* =============================================================================
   ตั้งค่าการเชื่อมต่อ Supabase
   -----------------------------------------------------------------------------
   ค่า SUPABASE_URL / SUPABASE_ANON_KEY เปิดเผยในหน้าเว็บได้ตามปกติ
   ความปลอดภัยจริงอยู่ที่ Row Level Security (ไฟล์ supabase/schema.sql)
   ห้ามใส่ service_role key เด็ดขาด
   ============================================================================= */
window.SUPABASE_URL = "https://tfcinnyixmbdcnzflsye.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmY2lubnlpeG1iZGNuemZsc3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjYzNTksImV4cCI6MjEwNDM0MjM1OX0.xh8f7BufQnih0UGC_X8mX_0A55K5FUYoil6gQwcWpGs";

/* ผู้ใช้พิมพ์แค่ "username" ระบบต่อท้ายให้เป็น username@dms.local ก่อนส่งเข้า Supabase Auth */
window.AUTH_EMAIL_DOMAIN = "dms.local";

/* URL ของ Google Apps Script (Deploy เดิม) — คงไว้ใช้เฉพาะ "อัปโหลดไฟล์ขึ้น Drive"
   ต้องเพิ่มฟังก์ชัน uploadFile ใน GS DMS แล้ว Deploy เวอร์ชันใหม่ (ดู SUPABASE-SETUP.md)
   ยังไม่ต้องแก้ตอนนี้ก็ได้ — จำเป็นเฉพาะตอนเพิ่มเอกสารที่มีไฟล์แนบ */
window.FILE_API_URL = "https://script.google.com/macros/s/PASTE_DEPLOY_ID/exec";
