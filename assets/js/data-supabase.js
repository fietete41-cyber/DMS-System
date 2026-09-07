/* =============================================================================
   Supabase data layer สำหรับ DMS
   -----------------------------------------------------------------------------
   ไฟล์นี้ "แทนที่" ฟังก์ชัน gsRun() ของ app.js โดยเปลี่ยนจากการยิงไป Google
   Apps Script เป็นการอ่าน/เขียน Supabase (Postgres + RLS) ตรง ๆ  โครงสร้าง
   callback ยังเหมือนเดิม  gsRun(action, params, onSuccess, options)  ทำให้
   app.js แทบไม่ต้องแก้อะไร

   ต้องโหลดไฟล์นี้ "หลัง" app.js เพื่อ override window.gsRun
   ต้องมี supabase-config.js และ supabase-js CDN โหลดมาก่อนหน้า
   ============================================================================= */
(function () {
  'use strict';

  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('[DMS] ไม่พบ supabase-js หรือ supabase-config.js');
    return;
  }

  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dms_sb_auth' }
  });

  const EMAIL_DOMAIN = window.AUTH_EMAIL_DOMAIN || 'dms.local';
  const usernameToEmail = (u) => String(u).trim().toLowerCase() + '@' + EMAIL_DOMAIN;

  let myProfile = null;   // { id, username, role, name, status }
  let entered = false;    // กัน enterApp ถูกเรียกซ้ำ

  // ค่าเหล่านี้ประกาศเป็น const ระดับ global ใน app.js (โหลดก่อนไฟล์นี้)
  const DEFAULT_DEPARTMENTS_FALLBACK = (typeof DEFAULT_DEPARTMENTS !== 'undefined' ? DEFAULT_DEPARTMENTS : {});
  const FALLBACK_LOGO = (typeof DEFAULT_LOGO_URL !== 'undefined' ? DEFAULT_LOGO_URL : '');

  // ---------------------------------------------------------------------------
  // แปลงแถว DB (snake_case) <-> object ที่ app.js ใช้ (camelCase)
  // ---------------------------------------------------------------------------
  function rowToDoc(r) {
    return {
      id: r.id,
      type: r.type || '',
      no: r.no || '',
      title: r.title || '',
      date: r.doc_date || '',
      from: r.from_to || '',
      department: r.department || '',
      subDepartment: r.sub_department || '',
      fileUrl: r.file_url || '',
      status: r.status || '',
      createdBy: r.created_by || '',
      assignee: r.assignee || '',
      dueDate: r.due_date || '',
      followupNote: r.followup_note || '',
      userStatus: r.user_status || '',
      userStatusReason: r.user_status_reason || '',
      userStatusBy: r.user_status_by || '',
      userStatusAt: r.user_status_at || ''
    };
  }

  function docObjToRow(d) {
    return {
      type: d.type,
      no: d.no || '',
      title: d.title || '',
      doc_date: d.date || '',
      from_to: d.from || '',
      department: d.department || '',
      sub_department: d.subDepartment || '',
      status: d.status || 'ใหม่',
      assignee: d.assignee || '',
      due_date: d.dueDate || '',
      followup_note: d.followupNote || ''
    };
  }

  function rowToUser(r) {
    return { id: r.id, username: r.username || '', password: '', role: r.role || 'user', name: r.name || '', status: r.status || 'Active' };
  }

  async function getDepartments() {
    try {
      const { data } = await sb.from('settings').select('data').eq('id', 'departments').maybeSingle();
      const s = data && data.data && data.data.structure;
      if (s && Object.keys(s).length) return s;
    } catch (e) {}
    return DEFAULT_DEPARTMENTS_FALLBACK;
  }

  async function writeLog(action, description) {
    try {
      await sb.from('logs').insert({
        username: (myProfile && myProfile.username) || '(unknown)',
        action: action, description: description || ''
      });
    } catch (e) {}
  }

  async function adminUsernames() {
    const { data } = await sb.from('users').select('username').eq('role', 'admin');
    return (data || []).map(u => (u.username || '').trim()).filter(Boolean);
  }

  async function notify(username, docId, message, type) {
    if (!username) return;
    await sb.from('notifications').insert({
      username: username, doc_id: docId ? String(docId) : '', message: message, type: type || 'assignment'
    });
  }

  async function uploadViaAppsScript(docObj) {
    const res = await fetch(window.FILE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'uploadFile', params: [docObj.fileData, docObj.fileName, docObj.mimeType, docObj.type] })
    });
    const out = await res.json();
    if (out.status !== 'success' || !out.fileUrl) throw new Error(out.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
    return out.fileUrl;
  }

  // เรียก Edge Function "admin" (จัดการบัญชีผู้ใช้)
  async function callAdmin(payload) {
    const { data, error } = await sb.functions.invoke('admin', { body: payload });
    if (error) {
      try { const b = await error.context.json(); if (b && b.message) return b; } catch (e) {}
      return { status: 'error', message: error.message || 'เรียก Edge Function ไม่สำเร็จ' };
    }
    return data;
  }

  // ---------------------------------------------------------------------------
  // ตัวจัดการแต่ละ action
  // ---------------------------------------------------------------------------
  const handlers = {

    async checkLogin(username, password) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: usernameToEmail(username), password: String(password)
      });
      if (error) {
        const m = /invalid login credentials/i.test(error.message)
          ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : error.message;
        return { status: 'error', message: m };
      }
      const { data: prof } = await sb.from('users').select('*').eq('id', data.user.id).maybeSingle();
      if (!prof) { await sb.auth.signOut(); return { status: 'error', message: 'ไม่พบข้อมูลผู้ใช้ในระบบ' }; }
      if (String(prof.status).trim() === 'Inactive') { await sb.auth.signOut(); return { status: 'error', message: 'บัญชีนี้ถูกระงับการใช้งาน' }; }
      myProfile = { id: prof.id, username: prof.username, role: prof.role, name: prof.name, status: prof.status };
      entered = true;
      return { status: 'success', user: { id: prof.id, username: prof.username, role: prof.role, name: prof.name } };
    },

    async getInitialData() {
      const [docsRes, usersRes, departments] = await Promise.all([
        sb.from('documents').select('*').order('created_at', { ascending: false }),
        sb.from('users').select('*').order('username'),
        getDepartments()
      ]);
      if (docsRes.error) throw docsRes.error;
      if (usersRes.error) throw usersRes.error;
      return {
        docs: (docsRes.data || []).map(rowToDoc),
        users: (usersRes.data || []).map(rowToUser),
        departments: departments
      };
    },

    async getDocuments() {
      const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(rowToDoc);
    },

    async getUsers() {
      const { data, error } = await sb.from('users').select('*').order('username');
      if (error) throw error;
      return (data || []).map(rowToUser);
    },

    async saveDocumentRecord(docObj) {
      try {
        let fileUrl = docObj.existingFileUrl || '';
        if (docObj.fileData) fileUrl = await uploadViaAppsScript(docObj);

        const row = docObjToRow(docObj);
        if (fileUrl) row.file_url = fileUrl;

        if (docObj.id) {
          const { data: before } = await sb.from('documents').select('assignee').eq('id', docObj.id).maybeSingle();
          const prevAssignee = before ? (before.assignee || '') : '';
          const { data: updated, error } = await sb.from('documents').update(row).eq('id', docObj.id).select('id');
          if (error) throw error;
          if (!updated || !updated.length) return { status: 'error', message: 'ไม่มีสิทธิ์แก้ไข หรือไม่พบเอกสาร' };
          if (row.assignee && row.assignee !== prevAssignee) {
            await notify(row.assignee, docObj.id, `คุณได้รับมอบหมายเอกสาร: ${row.no} — ${row.title}`, 'assignment');
          }
          await writeLog('UPDATE', `อัปเดตเอกสาร ${row.no}`);
        } else {
          row.created_by = (myProfile && myProfile.username) || docObj.createdBy || '';
          if (!row.file_url) row.file_url = '';
          const { data: ins, error } = await sb.from('documents').insert(row).select('id').single();
          if (error) throw error;
          if (row.assignee) {
            await notify(row.assignee, ins.id, `คุณได้รับมอบหมายเอกสาร: ${row.no} — ${row.title}`, 'assignment');
          }
          await writeLog('INSERT', `เพิ่มเอกสาร ${row.no}`);
        }
        return { status: 'success' };
      } catch (err) {
        return { status: 'error', message: (err && err.message) || String(err) };
      }
    },

    async deleteDocument(docId, username) {
      try {
        const { data } = await sb.from('documents').select('no').eq('id', docId).maybeSingle();
        const { data: deleted, error } = await sb.from('documents').delete().eq('id', docId).select('id');
        if (error) throw error;
        if (!deleted || !deleted.length) return { status: 'error', message: 'ไม่มีสิทธิ์ลบ หรือไม่พบเอกสาร' };
        await writeLog('DELETE', `ลบเอกสาร ${data ? (data.no || '') : ''}`);
        return { status: 'success' };
      } catch (err) {
        return { status: 'error', message: (err && err.message) || String(err) };
      }
    },

    async updateUserDocStatus(docId, userStatus, reason, username) {
      try {
        const { data, error } = await sb.rpc('rpc_update_user_doc_status', {
          p_doc_id: docId, p_status: userStatus, p_reason: reason || ''
        });
        if (error) throw error;
        return data;   // { status:'success', userStatus, userStatusReason, userStatusBy, userStatusAt }
      } catch (err) {
        return { status: 'error', message: (err && err.message) || String(err) };
      }
    },

    async saveUserRecord(userObj, actionByUsername) {
      if (userObj.id) {
        return callAdmin({
          action: 'updateUser', id: userObj.id, name: userObj.name,
          role: userObj.role, status: userObj.status || 'Active',
          password: userObj.password ? String(userObj.password) : undefined
        });
      }
      return callAdmin({
        action: 'createUser', username: userObj.username,
        password: userObj.password, name: userObj.name, role: userObj.role
      });
    },

    async deleteUser(userId, actionByUsername) {
      return callAdmin({ action: 'deleteUser', id: userId });
    },

    async importUserRecords(usersArray, actionByUsername) {
      return callAdmin({ action: 'importUsers', users: usersArray });
    },

    async saveSystemSettings(settingsObj) {
      try {
        const { error } = await sb.from('settings').upsert({
          id: 'system',
          data: {
            orgName: settingsObj.orgName || '',
            theme: settingsObj.theme || 'graysunset',
            logoUrl: settingsObj.logoUrl || ''
          }
        });
        if (error) throw error;
        return { status: 'success' };
      } catch (err) {
        return { status: 'error', message: (err && err.message) || String(err) };
      }
    },

    async getSystemSettings() {
      const DEF = { orgName: '', theme: 'graysunset', logoUrl: FALLBACK_LOGO };
      try {
        const { data } = await sb.from('settings').select('data').eq('id', 'system').maybeSingle();
        const s = (data && data.data) || {};
        return Object.assign({}, DEF, s, {
          logoUrl: (s.logoUrl && String(s.logoUrl).trim()) ? s.logoUrl : DEF.logoUrl
        });
      } catch (err) { return DEF; }
    },

    async getUserNotifications(username) {
      const uname = username || (myProfile && myProfile.username);
      if (!uname) return [];
      const { data, error } = await sb.from('notifications')
        .select('*').eq('username', uname)
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id, docId: r.doc_id || '', message: r.message || '',
        type: r.type || '', createdAt: r.created_at, isRead: !!r.is_read
      }));
    },

    async markNotificationRead(notificationId, username) {
      try {
        const { error } = await sb.from('notifications').update({ is_read: true }).eq('id', notificationId);
        if (error) throw error;
        return { status: 'success' };
      } catch (err) {
        return { status: 'error', message: (err && err.message) || String(err) };
      }
    }
  };

  // ---------------------------------------------------------------------------
  // แทนที่ gsRun ของ app.js
  // ---------------------------------------------------------------------------
  window.gsRun = function (action, params, onSuccess, options) {
    const fn = handlers[action];
    if (!fn) {
      console.error('[DMS] ไม่รู้จัก action:', action);
      if (window.Swal) Swal.fire('เกิดข้อผิดพลาด', 'ไม่พบคำสั่ง ' + action, 'error');
      return;
    }
    Promise.resolve()
      .then(() => fn.apply(null, params || []))
      .then((result) => { if (typeof onSuccess === 'function') onSuccess(result); })
      .catch((err) => {
        console.error('[DMS] gsRun error:', action, err);
        if (window.Swal) Swal.fire('เกิดข้อผิดพลาด', (err && err.message) || String(err), 'error');
      });
  };

  // ---------------------------------------------------------------------------
  // session: ให้ Supabase Auth คุมแทน sessionStorage ของ app.js
  // ---------------------------------------------------------------------------
  window.saveSession = function () {};
  window.clearSession = function () { try { sb.auth.signOut(); } catch (e) {} };
  window.loadSession = function () { return null; };

  // กู้สถานะเมื่อรีเฟรชหน้า
  (async function restore() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session || entered) return;
      const { data: prof } = await sb.from('users').select('*').eq('id', session.user.id).maybeSingle();
      if (!prof || String(prof.status).trim() === 'Inactive') { await sb.auth.signOut(); return; }
      myProfile = { id: prof.id, username: prof.username, role: prof.role, name: prof.name, status: prof.status };
      entered = true;
      if (typeof window.enterApp === 'function') {
        window.enterApp({ id: prof.id, username: prof.username, role: prof.role, name: prof.name }, true);
      }
    } catch (e) { console.error('[DMS] restore session error', e); }
  })();

  console.info('[DMS] Supabase data layer พร้อมใช้งาน');
})();
