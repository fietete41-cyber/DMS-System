# ย้ายฐานข้อมูล DMS จาก Google Sheets → Supabase

ทำตามลำดับนี้ ทั้งหมดใช้เวลาราว 30–45 นาที **ทำบน branch `supabase-migration` ก่อน อย่าเพิ่ง merge เข้า `main`**

---

## 1. สร้างโปรเจกต์ Supabase

1. เข้า https://supabase.com/dashboard → **New project**
   - Name: `dms` · Region: **Southeast Asia (Singapore)** · ตั้ง Database password (จดไว้)
2. รอสร้างเสร็จ (~2 นาที)

## 2. ตั้งค่า Auth

1. เมนู **Authentication → Sign In / Providers**
2. เปิด **Email** ให้ Enabled
3. **ปิด** "Confirm email" (ผู้ใช้ล็อกอินด้วย username ไม่มีอีเมลจริง)
4. (ถ้ามี) ปิด "Secure email change" ด้วยก็ได้

## 3. สร้างตาราง+ Security Rules

1. เมนู **SQL Editor → New query**
2. วางเนื้อหาไฟล์ [`supabase/schema.sql`](supabase/schema.sql) ทั้งหมด → **Run**
3. ต้องขึ้น "Success. No rows returned"

## 4. ใส่ค่าเชื่อมต่อในหน้าเว็บ

1. เมนู **Project Settings → API** ก๊อป 2 ค่า:
   - **Project URL**
   - **Project API keys → `anon` `public`**
2. เปิด [`assets/js/supabase-config.js`](assets/js/supabase-config.js) วางแทน `PASTE_...`
3. ช่อง `FILE_API_URL` = URL `/exec` ของ Apps Script เดิม (ข้อ 7)

## 5. Deploy Edge Function `admin` (จัดการบัญชีผู้ใช้)

1. เมนู **Edge Functions → Deploy a new function** (ผ่าน dashboard ได้ ไม่ต้องลง CLI)
2. ชื่อฟังก์ชัน: **`admin`**
3. วางเนื้อหาไฟล์ [`supabase/functions/admin/index.ts`](supabase/functions/admin/index.ts) ทั้งหมด → **Deploy**
   - ไม่ต้องตั้ง secret เพิ่ม (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` มีให้อัตโนมัติ)

## 6. สร้างบัญชีแอดมินคนแรก (ทำมือ 1 ครั้ง)

1. เมนู **Authentication → Users → Add user → Create new user**
   - Email: `admin@dms.local` · Password: (ตั้งเอง) · **ติ๊ก Auto Confirm User**
   - กด Create → คลิกที่ผู้ใช้ที่เพิ่งสร้าง ก๊อป **User UID**
2. เมนู **SQL Editor** รัน (แทน `UID_ที่ก๊อปมา` และชื่อจริง):
   ```sql
   insert into public.users (id, username, name, role, status)
   values ('UID_ที่ก๊อปมา', 'admin', 'ผู้ดูแลระบบ', 'admin', 'Active');
   ```

## 7. เพิ่มฟังก์ชันอัปโหลดไฟล์ใน Apps Script เดิม

ไฟล์เดิมยังใช้เก็บไฟล์แนบใน Google Drive ต่อ — เพิ่มแค่ทางเข้าอัปโหลด

1. เปิด Apps Script editor ของ DMS → วางทับด้วยไฟล์ `GS DMS.txt` เวอร์ชันล่าสุด
   (เพิ่ม `uploadFile` ใน handlers + ฟังก์ชัน `uploadFile()` ให้แล้ว)
2. **Deploy → Manage deployments → แก้ deployment เดิม → New version → Deploy**
   (URL `/exec` ต้องเท่าเดิม = ค่าที่ใส่ในข้อ 4)

## 8. ย้ายข้อมูลเดิม

1. เปิดไฟล์ [`tools/migrate.html`](tools/migrate.html) ในเบราว์เซอร์
   (เปิดจากเครื่องผ่าน Live Server / หรือ push branch แล้วเปิด `…/tools/migrate.html`)
2. กรอก: username/รหัสผ่านแอดมิน (ข้อ 6) + URL `/exec` ของ Apps Script เดิม
3. กด **เริ่มย้ายข้อมูล** → รอจนขึ้น "เสร็จสิ้น ✔"
   - ผู้ใช้: สร้างบัญชีล็อกอิน + โปรไฟล์ ด้วยรหัสผ่านเดิมจากชีต
   - เอกสาร: ย้ายทั้งหมด เรียงลำดับเดิม
   - การตั้งค่า + โครงสร้างฝ่าย/งาน
   - *หมายเหตุ:* การแจ้งเตือนเก่าไม่ย้าย (เป็นข้อมูลชั่วคราว)

## 9. ทดสอบ

เปิด `index.html` (จาก branch นี้) → ล็อกอินด้วยบัญชีเดิม ทดสอบ:
- [ ] เห็น Dashboard + รายการเอกสารครบ
- [ ] admin: เพิ่ม/แก้/ลบเอกสาร + อัปโหลดไฟล์แนบ + เปิดไฟล์
- [ ] admin: เพิ่มผู้ใช้ใหม่ / แก้ / ลบ / รีเซ็ตรหัสผ่าน (พิมพ์รหัสใหม่ในช่องรหัสผ่านตอนแก้)
- [ ] user: กดปุ่ม "สถานะ" อัปเดตสถานะ → admin ได้รับแจ้งเตือน
- [ ] ออกจากระบบ / ล็อกอินสลับ admin↔user ไม่มีค้าง

## 10. ขึ้นใช้งานจริง

```bash
git checkout main
git merge supabase-migration
git push origin main
```
GitHub Pages จะ deploy อัตโนมัติ

### กันโปรเจกต์ Supabase ถูก pause (ฟรีจะหยุดถ้าไม่ใช้ 7 วัน)

ตั้ง cron ที่ https://cron-job.org (ฟรี) ยิง `GET` ไปที่
`https://<PROJECT_REF>.supabase.co/rest/v1/settings?id=eq.system&select=id`
พร้อม header `apikey: <ANON_KEY>` วันละครั้ง

---

## ย้อนกลับถ้ามีปัญหา

ระบบเดิม (Apps Script + Sheets) ยังอยู่ครบ ไม่ถูกแตะ — แค่ `git checkout main`
กลับไปเวอร์ชันก่อน merge หน้าเว็บก็ใช้ของเดิมทันที
