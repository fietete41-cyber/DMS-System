
let appUsers = [];
        let appDocuments = [];
        let appNotifications = [];
        let notificationTimer = null;
        let knownUnreadNotificationIds = new Set();
        let appDepartments = {};
        let currentUser = null;
let currentDocType = 'doc-in'; 
let mobileDocPage = 1;
const MOBILE_DOC_PAGE_SIZE = 20;
        let barChartInstance, pieChartInstance;
        let docModal, userModal, importPreviewModal;
        let pendingImportUsers = [];
        let currentThemeKey = 'graysunset';
        const DEFAULT_LOGO_URL = 'https://i.postimg.cc/FR3ZBhVM/sanea-khxng-s-n-ange-n-s-khaw-th-nsm-y-mode-r-n-thangkar-th-rk-c-cdhmay-xeksar-A4-(11).png';
        let appSettings = { orgName: '', theme: 'graysunset', logoUrl: DEFAULT_LOGO_URL };
        let autoRefreshTimer = null;
        const AUTO_REFRESH_MS = 5 * 60 * 1000; // รีเฟรชข้อมูลอัตโนมัติทุก 5 นาที
        const NOTIFICATION_REFRESH_MS = 30 * 1000;
 
        // โครงสร้างฝ่าย/งานสำรอง (กรณีเซิร์ฟเวอร์ยังไม่ส่งค่ามา) - ใช้ตอนหน้าเว็บเพิ่งโหลด
        const DEFAULT_DEPARTMENTS = {
            'ฝ่ายบริหารทรัพยากร': [
                'งานบริหารทั่วไป',
                'งานบริหารและพัฒนาทรัพยากรบุคลากร',
                'งานการเงิน',
                'งานบัญชี',
                'งานพัสดุ',
                'งานอาคารสถานที่',
                'งานทะเบียน',
                'งานตรวจสอบภายใน'
            ],
            'ฝ่ายยุทธศาสตร์และแผนงาน': [
                'งานพัฒนายุทธศาสตร์แผนงานและงบประมาณ',
                'งานประกันคุณภาพการศึกษาฯ',
                'งานศูนย์ดิจิทัลฯ',
                'งานส่งเสริมการวิจัยฯ',
                'งานส่งเสริมธุรกิจฯ',
                'งานติดตามและประเมินผลการอาชีวศึกษา'
            ],
            'ฝ่ายกิจการนักเรียน นักศึกษา': [
                'งานกิจการนักเรียน นักศึกษา',
                'งานปกครองฯ',
                'งานโครงการพิเศษฯ',
                'งานครูที่ปรึกษาและการแนะแนว',
                'งานสวัสดิการฯ'
            ],
            'ฝ่ายวิชาการ': [
                'งานหลักสูตร',
                'งานวัดและประเมินผล',
                'งานอาชีวศึกษาระบบทวิภาคี',
                'งานวิทยบริการฯ',
                'งานการศึกษาพิเศษ',
                'งานเทคโนโลยีฯ'
            ]
        };
 
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            if (e.isComposing) return;
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag !== 'input') return;
 
            e.preventDefault();
            e.stopPropagation();
 
            if (e.target.closest('#loginForm')) return handleLogin(e);
            if (e.target.closest('#docForm')) return saveDocument(e);
            if (e.target.closest('#userForm')) return saveUser(e);
            if (e.target.id === 'settingOrgName') return saveSettings(e);
            if (e.target.id === 'settingLogoUrl') return saveSettings(e);
        }, true);
 
        function togglePasswordVisibility(inputId, iconWrapperEl) {
            const input = document.getElementById(inputId);
            const icon = iconWrapperEl.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
 
        function previewLogoUrl() {
            const url = document.getElementById('settingLogoUrl').value.trim() || DEFAULT_LOGO_URL;
            document.getElementById('settingLogoPreview').src = url;
        }
 
        function resetLogoToDefault() {
            document.getElementById('settingLogoUrl').value = DEFAULT_LOGO_URL;
            previewLogoUrl();
        }
 
        function applyLogo(url) {
            const finalUrl = url || DEFAULT_LOGO_URL;
            const loginLogo = document.getElementById('login-logo');
            const sidebarLogo = document.getElementById('sidebar-logo');
            if (loginLogo) {
                loginLogo.src = finalUrl;
                loginLogo.style.display = finalUrl ? 'inline-block' : 'none';
            }
            if (sidebarLogo) {
                sidebarLogo.src = finalUrl;
                sidebarLogo.style.display = finalUrl ? 'inline-block' : 'none';
            }
        }
 
       const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwNcGKAjuI10DUlD3NEOQOMAER-ow6Y85SvZKqDM3P-qCzDj9YJcDW0_utQrlfjDxm9/exec'; // เปลี่ยนเป็นลิงก์ /exec ของคุณ
 
function gsRun(functionName, args, onSuccess, options) {
    // เมื่อรันจาก Google Apps Script ให้เรียก server-side ของ Deployment เดียวกันโดยตรง
    // เพื่อป้องกันข้อมูลถูกส่งไปยัง URL ของ Deployment เก่า
    if (typeof google !== 'undefined' && google.script && google.script.run) {
        const runner = google.script.run
            .withSuccessHandler(onSuccess)
            .withFailureHandler(function (err) {
                Swal.fire('เกิดข้อผิดพลาด', (err && err.message) || String(err), 'error');
            });
        runner[functionName](...(args || []));
        return;
    }

    options = options || {};
    const timeoutMs = options.timeoutMs || 20000;
    let done = false;
    const controller = new AbortController();
 
    const timer = setTimeout(function () {
        if (done) return;
        done = true;
        controller.abort();
        Swal.fire('หมดเวลาเชื่อมต่อ', 'เซิร์ฟเวอร์ไม่ตอบสนองภายในเวลาที่กำหนด', 'error');
    }, timeoutMs);
 
    fetch(WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: functionName, params: args || [] }),
        signal: controller.signal
    })
        .then(function (res) { return res.json(); })
        .then(function (result) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            onSuccess(result);
        })
        .catch(function (err) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            if (err.name === 'AbortError') return;
            Swal.fire('เกิดข้อผิดพลาด', err.message || String(err), 'error');
        });
}
 
        const THEMES = {
            graysunset: {
                name: 'เทา-ส้ม',
                vars: {
                    '--app-bg': '#F7F8FA',
                    '--app-sidebar-from': '#9AA5B1',
                    '--app-sidebar-to': '#FF8C3D',
                    '--app-btn-text': '#ffffff',
                    '--bs-primary': '#FF8C3D', '--bs-primary-rgb': '255,140,61',
                    '--bs-secondary': '#94A3B3', '--bs-secondary-rgb': '148,163,179',
                    '--bs-success': '#22C55E', '--bs-success-rgb': '34,197,94',
                    '--bs-info': '#8FD3E8', '--bs-info-rgb': '143,211,232',
                    '--bs-warning': '#FBBF24', '--bs-warning-rgb': '251,191,36',
                    '--bs-danger': '#EF4444', '--bs-danger-rgb': '239,68,68'
                }
            },
            sky: {
                name: 'ฟ้า-เทอร์ควอยซ์',
                vars: {
                    '--app-bg': '#EFF6FB',
                    '--app-sidebar-from': '#0B5ED7',
                    '--app-sidebar-to': '#12C9B0',
                    '--app-btn-text': '#ffffff',
                    '--bs-primary': '#2F8FEA', '--bs-primary-rgb': '47,143,234',
                    '--bs-secondary': '#12C9B0', '--bs-secondary-rgb': '18,201,176',
                    '--bs-success': '#22C55E', '--bs-success-rgb': '34,197,94',
                    '--bs-info': '#06B6D4', '--bs-info-rgb': '6,182,212',
                    '--bs-warning': '#F5A524', '--bs-warning-rgb': '245,165,36',
                    '--bs-danger': '#EF4444', '--bs-danger-rgb': '239,68,68'
                }
            },
            mint: {
                name: 'มรกต-ฟ้าเทอร์ควอยซ์',
                vars: {
                    '--app-bg': '#ECFAF5',
                    '--app-sidebar-from': '#0F9D58',
                    '--app-sidebar-to': '#00C2CB',
                    '--app-btn-text': '#ffffff',
                    '--bs-primary': '#10B981', '--bs-primary-rgb': '16,185,129',
                    '--bs-secondary': '#06B6D4', '--bs-secondary-rgb': '6,182,212',
                    '--bs-success': '#22C55E', '--bs-success-rgb': '34,197,94',
                    '--bs-info': '#14B8A6', '--bs-info-rgb': '20,184,166',
                    '--bs-warning': '#F5A524', '--bs-warning-rgb': '245,165,36',
                    '--bs-danger': '#EF4444', '--bs-danger-rgb': '239,68,68'
                }
            },
            lavender: {
                name: 'ม่วง-ชมพูสด',
                vars: {
                    '--app-bg': '#F6F2FE',
                    '--app-sidebar-from': '#6C3CE9',
                    '--app-sidebar-to': '#FF5DA2',
                    '--app-btn-text': '#ffffff',
                    '--bs-primary': '#8B5CF6', '--bs-primary-rgb': '139,92,246',
                    '--bs-secondary': '#EC4899', '--bs-secondary-rgb': '236,72,153',
                    '--bs-success': '#22C55E', '--bs-success-rgb': '34,197,94',
                    '--bs-info': '#6366F1', '--bs-info-rgb': '99,102,241',
                    '--bs-warning': '#F5A524', '--bs-warning-rgb': '245,165,36',
                    '--bs-danger': '#EF4444', '--bs-danger-rgb': '239,68,68'
                }
            },
            peach: {
                name: 'ส้ม-โค้อรัลสด',
                vars: {
                    '--app-bg': '#FFF3EC',
                    '--app-sidebar-from': '#FF7A00',
                    '--app-sidebar-to': '#FF3D68',
                    '--app-btn-text': '#ffffff',
                    '--bs-primary': '#FB923C', '--bs-primary-rgb': '251,146,60',
                    '--bs-secondary': '#F43F5E', '--bs-secondary-rgb': '244,63,94',
                    '--bs-success': '#22C55E', '--bs-success-rgb': '34,197,94',
                    '--bs-info': '#38BDF8', '--bs-info-rgb': '56,189,248',
                    '--bs-warning': '#FBBF24', '--bs-warning-rgb': '251,191,36',
                    '--bs-danger': '#E11D48', '--bs-danger-rgb': '225,29,72'
                }
            },
            rose: {
                name: 'โรส-ไวโอเลตสด',
                vars: {
                    '--app-bg': '#FDF1F6',
                    '--app-sidebar-from': '#FF2E63',
                    '--app-sidebar-to': '#7B2FF7',
                    '--app-btn-text': '#ffffff',
                    '--bs-primary': '#F43F5E', '--bs-primary-rgb': '244,63,94',
                    '--bs-secondary': '#A855F7', '--bs-secondary-rgb': '168,85,247',
                    '--bs-success': '#22C55E', '--bs-success-rgb': '34,197,94',
                    '--bs-info': '#38BDF8', '--bs-info-rgb': '56,189,248',
                    '--bs-warning': '#FBBF24', '--bs-warning-rgb': '251,191,36',
                    '--bs-danger': '#DC2626', '--bs-danger-rgb': '220,38,38'
                }
            }
        };
 
        function applyTheme(key) {
            const theme = THEMES[key];
            if (!theme) return;
            const rootStyle = document.documentElement.style;
            Object.entries(theme.vars).forEach(([varName, value]) => rootStyle.setProperty(varName, value));
            currentThemeKey = key;
            document.querySelectorAll('.theme-swatch').forEach(el => {
                el.classList.toggle('active', el.dataset.theme === key);
            });
            if (document.getElementById('view-dashboard') && document.getElementById('view-dashboard').classList.contains('active') && currentUser) {
                updateDashboard();
            }
        }
 
        function renderThemeSwatches() {
            const grid = document.getElementById('themeSwatchGrid');
            if (!grid) return;
            grid.innerHTML = Object.entries(THEMES).map(([key, theme]) => `
                <div class="col">
                    <div class="theme-swatch ${key === currentThemeKey ? 'active' : ''}" data-theme="${key}" onclick="applyTheme('${key}')">
                        <div class="swatch-preview" style="background: linear-gradient(135deg, ${theme.vars['--app-sidebar-from']}, ${theme.vars['--app-sidebar-to']});"></div>
                        <div class="swatch-name">${theme.name}</div>
                    </div>
                </div>
            `).join('');
        }
 
        const SESSION_KEY = 'dms_session_user';
 
        function saveSession(user) {
            try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (err) {}
        }
        function loadSession() {
            try {
                const raw = sessionStorage.getItem(SESSION_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (err) { return null; }
        }
        function clearSession() {
            try { sessionStorage.removeItem(SESSION_KEY); } catch (err) {}
        }
 
        function enterApp(user, isRestoring) {
            currentUser = user;
            saveSession(user);
 
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-screen').style.display = 'block';
            // Always start with the drawer closed on a phone (including browser back/restore cases).
            if (window.innerWidth <= 768) closeMobileSidebar();

            document.getElementById('user-display-name').innerText = currentUser.name;
            document.getElementById('user-display-role').innerText = currentUser.role.toUpperCase();
            document.getElementById('user-display-role').className = currentUser.role === 'admin' ? 'badge bg-danger mt-1' : 'badge bg-info mt-1';
 
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(el => {
                el.style.display = (currentUser.role === 'admin') ? 'block' : 'none';
            });
 
            loadAppData(isRestoring);
            startAutoRefresh();
        }
 
        document.addEventListener("DOMContentLoaded", function() {
            docModal = new bootstrap.Modal(document.getElementById('docModal'));
            userModal = new bootstrap.Modal(document.getElementById('userModal'));
            importPreviewModal = new bootstrap.Modal(document.getElementById('importPreviewModal'));
 
            currentThemeKey = 'graysunset';
            applyTheme('graysunset');
            renderThemeSwatches();
            applyLogo(DEFAULT_LOGO_URL);
 
            populateDepartmentOptions(DEFAULT_DEPARTMENTS);
            
            document.getElementById('sidebarCollapse').addEventListener('click', function () {
                document.getElementById('sidebar').classList.toggle('active');
                document.getElementById('content').classList.toggle('active');
                updateSidebarOverlay();
            });
 
            window.addEventListener('resize', updateSidebarOverlay);
            document.addEventListener('click', function(event) {
                if (!event.target.closest('#notification-dropdown')) closeNotificationPanel();
            });
 
            gsRun('getSystemSettings', [], function (settings) {
                // Apply the saved theme before login as well, not only after entering the app.
                // This keeps the login background, login button, and application shell in sync.
                applySystemSettings(settings);
            }, { timeoutMs: 15000 });
 
            const savedUser = loadSession();
            if (savedUser) {
                enterApp(savedUser, true);
            }
        });
 
        // หา "งาน" ที่ถูกพิมพ์เองผ่าน "อื่นๆ (ระบุ)" ในเอกสารจริง แต่ไม่ได้อยู่ในโครงสร้างฝ่าย/งานมาตรฐาน
        // ใช้เติมลงในตัวกรองของ Dashboard/ค้นหา เพื่อให้เลือกกรองเอกสารกลุ่มนี้ได้
        function getCustomSubDepartments(deptName) {
            if (!deptName) return [];
            const knownSubs = appDepartments[deptName] || [];
            const found = new Set();
            appDocuments.forEach(d => {
                if (d.department === deptName && d.subDepartment && !knownSubs.includes(d.subDepartment)) {
                    found.add(d.subDepartment);
                }
            });
            return Array.from(found).sort();
        }
 
        // สร้าง <option> ของ "งาน" ตามฝ่ายที่เลือกไว้ ให้กับ select ปลายทางที่ระบุ
        function populateSubDeptSelect(selectEl, deptName, placeholderText, allowAll, includeOther, customSubs) {
            if (!selectEl) return;
            const subs = (deptName && appDepartments[deptName]) ? appDepartments[deptName] : [];
            let html = '';
            if (allowAll) {
                html += '<option value="all">ทุกงาน</option>';
            } else {
                html += `<option value="">${deptName ? '-- เลือกงาน --' : placeholderText}</option>`;
            }
            html += subs.map(s => `<option value="${s}">${s}</option>`).join('');
            if (customSubs && customSubs.length) {
                html += customSubs.map(s => `<option value="${s}">${s} (อื่นๆ)</option>`).join('');
            }
            if (includeOther) {
                html += '<option value="__other__">อื่นๆ (ระบุ)</option>';
            }
            selectEl.innerHTML = html;
        }
 
        function populateDepartmentOptions(departments) {
            appDepartments = departments || {};
            const deptNames = Object.keys(appDepartments);
 
            // Select ฝ่ายในฟอร์มเพิ่ม/แก้ไขเอกสาร
            const docSelect = document.getElementById('docDepartment');
            const currentDocVal = docSelect.value;
            docSelect.innerHTML = '<option value="">-- เลือกฝ่าย --</option>' +
                deptNames.map(d => `<option value="${d}">${d}</option>`).join('');
            if (deptNames.includes(currentDocVal)) {
                docSelect.value = currentDocVal;
                populateSubDeptSelect(document.getElementById('docSubDepartment'), currentDocVal, '-- เลือกฝ่ายก่อน --', false, true);
            } else {
                populateSubDeptSelect(document.getElementById('docSubDepartment'), '', '-- เลือกฝ่ายก่อน --', false, true);
            }
 
            // Select ฝ่ายในตัวกรอง (Dashboard และค้นหา) - มีตัวเลือก "ทุกฝ่าย"
            const filterSelectIds = ['dashDept', 'searchDept'];
            filterSelectIds.forEach(id => {
                const sel = document.getElementById(id);
                if (!sel) return;
                const currentVal = sel.value || 'all';
                sel.innerHTML = '<option value="all">ทุกฝ่าย</option>' +
                    deptNames.map(d => `<option value="${d}">${d}</option>`).join('');
                const stillExists = Array.from(sel.options).some(o => o.value === currentVal);
                sel.value = stillExists ? currentVal : 'all';
 
                const subSelId = id === 'dashDept' ? 'dashSubDept' : 'searchSubDept';
                const subSel = document.getElementById(subSelId);
                if (subSel) {
                    const deptForSub = sel.value === 'all' ? '' : sel.value;
                    populateSubDeptSelect(subSel, deptForSub, '', true, false, getCustomSubDepartments(deptForSub));
                }
            });
        }
 
        function onDocDepartmentChange() {
            const deptVal = document.getElementById('docDepartment').value;
            populateSubDeptSelect(document.getElementById('docSubDepartment'), deptVal, '-- เลือกฝ่ายก่อน --', false, true);
            onDocSubDepartmentChange();
        }
 
        function onDocSubDepartmentChange() {
            const val = document.getElementById('docSubDepartment').value;
            const wrap = document.getElementById('docSubDepartmentOtherWrap');
            if (val === '__other__') {
                wrap.style.display = 'block';
            } else {
                wrap.style.display = 'none';
                document.getElementById('docSubDepartmentOther').value = '';
            }
        }
 
        function onDashDeptChange() {
            const deptVal = document.getElementById('dashDept').value === 'all' ? '' : document.getElementById('dashDept').value;
            populateSubDeptSelect(document.getElementById('dashSubDept'), deptVal, '', true, false, getCustomSubDepartments(deptVal));
            updateDashboard();
        }
 
        function onSearchDeptChange() {
            const deptVal = document.getElementById('searchDept').value === 'all' ? '' : document.getElementById('searchDept').value;
            populateSubDeptSelect(document.getElementById('searchSubDept'), deptVal, '', true, false, getCustomSubDepartments(deptVal));
        }
 
        function startAutoRefresh() {
            stopAutoRefresh();
            autoRefreshTimer = setInterval(function () {
                if (currentUser) refreshData(false);
            }, AUTO_REFRESH_MS);
            notificationTimer = setInterval(function () {
                if (currentUser) loadNotifications();
            }, NOTIFICATION_REFRESH_MS);
        }
 
        function stopAutoRefresh() {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
                autoRefreshTimer = null;
            }
            if (notificationTimer) {
                clearInterval(notificationTimer);
                notificationTimer = null;
            }
            knownUnreadNotificationIds = new Set();
        }
 
        function updateLastRefreshLabel() {
            const label = document.getElementById('last-refresh-label');
            if (!label) return;
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            label.innerText = 'อัปเดตล่าสุด ' + hh + ':' + mm + ' น.';
        }
 
        function loadNotifications() {
            if (!currentUser) return;
            gsRun('getUserNotifications', [currentUser.username], function(items) {
                appNotifications = Array.isArray(items) ? items : [];
                renderNotifications();
                const unreadIds = new Set(appNotifications.filter(item => !item.isRead).map(item => String(item.id)));
                const newItems = appNotifications.filter(item => !item.isRead && knownUnreadNotificationIds.size && !knownUnreadNotificationIds.has(String(item.id)));
                knownUnreadNotificationIds = unreadIds;
                if (newItems.length) {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'คุณมีงานที่ได้รับมอบหมายใหม่', showConfirmButton: false, timer: 4500, timerProgressBar: true });
                }
            }, { timeoutMs: 15000 });
        }

        function renderNotifications() {
            const menu = document.getElementById('notification-menu');
            const count = document.getElementById('notification-count');
            if (!menu || !count) return;
            const unread = appNotifications.filter(item => !item.isRead);
            count.textContent = unread.length > 99 ? '99+' : unread.length;
            count.classList.toggle('d-none', unread.length === 0);
            if (!appNotifications.length) {
                menu.innerHTML = '<div class="text-center text-muted small py-3"><i class="fas fa-bell-slash d-block fs-5 mb-2"></i>ยังไม่มีการแจ้งเตือน</div>';
                return;
            }
            menu.innerHTML = '<div class="px-2 py-1 small fw-bold text-secondary">การแจ้งเตือน</div>' + appNotifications.map(item => {
                const time = item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '';
                const idArg = JSON.stringify(String(item.id));
                return `<button class="dropdown-item notification-item ${item.isRead ? '' : 'unread'}" onclick='openNotification(${idArg})'>
                    <div class="d-flex gap-2"><i class="fas fa-bell text-primary mt-1"></i><div><div>${escapeDashboardText(item.message || 'มีการแจ้งเตือนใหม่')}</div><div class="notification-time">${escapeDashboardText(time)}</div></div></div>
                </button>`;
            }).join('');
        }

        function toggleNotificationPanel(event) {
            if (event) event.stopPropagation();
            const menu = document.getElementById('notification-menu');
            const button = document.getElementById('notification-toggle');
            if (!menu || !button) return;
            const isOpen = menu.classList.toggle('show');
            button.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) loadNotifications();
        }

        function closeNotificationPanel() {
            const menu = document.getElementById('notification-menu');
            const button = document.getElementById('notification-toggle');
            if (menu) menu.classList.remove('show');
            if (button) button.setAttribute('aria-expanded', 'false');
        }

        function openNotification(notificationId) {
            const notification = appNotifications.find(item => String(item.id) === String(notificationId));
            if (!notification) return;
            closeNotificationPanel();
            if (!notification.isRead && currentUser) {
                gsRun('markNotificationRead', [notification.id, currentUser.username], function() {
                    notification.isRead = true;
                    renderNotifications();
                }, { timeoutMs: 15000 });
            }
            if (notification.docId) openDashboardDocument(notification.docId);
        }

        function showAutoRefreshToast() {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2500,
                timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: 'อัปเดตข้อมูลอัตโนมัติแล้ว' });
        }
 
        function refreshData(isManual) {
            if (!currentUser) return;
 
            if (isManual) {
                Swal.fire({ title: 'กำลังรีเฟรชข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
            }
 
            gsRun('getInitialData', [], function (data) {
                appDocuments = data.docs;
                appUsers = data.users;
                populateDepartmentOptions(data.departments && Object.keys(data.departments).length ? data.departments : DEFAULT_DEPARTMENTS);
 
                populateYearOptions();
                updateDashboard();
                loadNotifications();

                if (document.getElementById('view-doc-list').classList.contains('active')) {
                    renderDocList(currentDocType);
                }
                if (currentUser.role === 'admin' && document.getElementById('view-users').classList.contains('active')) {
                    renderUserList();
                }
 
                gsRun('getSystemSettings', [], function (settings) {
                    applySystemSettings(settings);
                    updateLastRefreshLabel();
 
                    if (isManual) {
                        Swal.close();
                        Swal.fire({ title: 'รีเฟรชข้อมูลเรียบร้อย', icon: 'success', timer: 900, showConfirmButton: false });
                    } else {
                        showAutoRefreshToast();
                    }
                });
            }, { timeoutMs: isManual ? 20000 : 30000 });
        }
 
        function handleLogin(e) {
            if (e && e.preventDefault) e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
 
            Swal.fire({ title: 'กำลังตรวจสอบข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
 
            gsRun('checkLogin', [user, pass], function(response) {
                if(response.status === 'success') {
                    enterApp(response.user, false);
                } else {
                    Swal.fire('ข้อผิดพลาด', response.message, 'error');
                }
            });
        }
 
        function loadAppData(isRestoring) {
            Swal.fire({
                title: isRestoring ? 'กำลังโหลดข้อมูล...' : 'กำลังโหลดข้อมูลจากระบบ...',
                allowOutsideClick: false, didOpen: () => { Swal.showLoading() }
            });
            
            gsRun('getInitialData', [], function(data) {
                appDocuments = data.docs;
                appUsers = data.users;
                populateDepartmentOptions(data.departments && Object.keys(data.departments).length ? data.departments : DEFAULT_DEPARTMENTS);
                
                populateYearOptions();
                updateDashboard();
                loadNotifications();
                if(currentUser.role === 'admin') {
                    renderUserList();
                }
 
                gsRun('getSystemSettings', [], function(settings) {
                    applySystemSettings(settings);
                    updateLastRefreshLabel();
                    Swal.close();
                    if (!isRestoring) {
                        Swal.fire({ title: 'เข้าสู่ระบบสำเร็จ', icon: 'success', timer: 1000, showConfirmButton: false });
                    }
                });
            });
        }
 
        function applySystemSettings(settings) {
            appSettings = settings || { orgName: '', theme: 'graysunset', logoUrl: DEFAULT_LOGO_URL };
 
            const orgDisplay = document.getElementById('org-name-display');
            if (appSettings.orgName) {
                orgDisplay.innerText = appSettings.orgName;
                orgDisplay.style.display = 'block';
            } else {
                orgDisplay.style.display = 'none';
            }
 
            const orgInput = document.getElementById('settingOrgName');
            if (orgInput) orgInput.value = appSettings.orgName || '';
 
            const logoUrl = appSettings.logoUrl || DEFAULT_LOGO_URL;
            applyLogo(logoUrl);
            const logoInput = document.getElementById('settingLogoUrl');
            if (logoInput) logoInput.value = appSettings.logoUrl || '';
            const logoPreview = document.getElementById('settingLogoPreview');
            if (logoPreview) logoPreview.src = logoUrl;
 
            if (appSettings.theme && THEMES[appSettings.theme]) {
                applyTheme(appSettings.theme);
                renderThemeSwatches();
            }
        }
 
        function handleLogout() {
            Swal.fire({
                title: 'ยืนยันการออกจากระบบ?', icon: 'warning', showCancelButton: true,
                confirmButtonText: 'ออกจากระบบ', cancelButtonText: 'ยกเลิก'
            }).then((result) => {
                if (result.isConfirmed) {
                    currentUser = null;
                    clearSession();
                    stopAutoRefresh();
                    document.getElementById('app-screen').style.display = 'none';
                    document.getElementById('login-screen').style.display = 'flex';
                    
                }
            });
        }
 
        // บนมือถือ คลาส "active" ของ #sidebar หมายถึง "ถูกซ่อนอยู่" (ตรงข้ามกับพฤติกรรมบนจอใหญ่)
        // ฟังก์ชันนี้จะแสดง/ซ่อนฉากทึบด้านหลังให้ตรงกับสถานะเมนูปัจจุบันเสมอ
        function updateSidebarOverlay() {
            const overlay = document.getElementById('sidebar-overlay');
            if (!overlay) return;
            const sidebarEl = document.getElementById('sidebar');
            const isMobile = window.innerWidth <= 768;
            // บนมือถือ คลาส .active ทำให้เมนู "แสดง" (ตรงข้ามกับความหมายบนจอใหญ่)
            const isMenuOpen = isMobile && sidebarEl.classList.contains('active');
            overlay.classList.toggle('show', isMenuOpen);
        }
 
        function closeMobileSidebar() {
            // บนจอมือถือ ต้อง "เอา" คลาส active ออกเพื่อซ่อนเมนู (ตรงข้ามกับพฤติกรรมบนจอใหญ่)
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('content').classList.remove('active');
            updateSidebarOverlay();
        }
 
        function switchMenu(menuId, el) {
            document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
            if(el) el.classList.add('active');
 
            document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
 
            if(menuId === 'dashboard') {
                document.getElementById('view-dashboard').classList.add('active');
                updateDashboard();
            } else if (menuId.startsWith('doc-')) {
                document.getElementById('view-doc-list').classList.add('active');
        currentDocType = menuId;
        mobileDocPage = 1;
        renderDocList(menuId);
            } else if (menuId === 'users') {
                document.getElementById('view-users').classList.add('active');
                renderUserList();
            } else {
                document.getElementById('view-' + menuId).classList.add('active');
            }
            
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
        }
 
function getDocTypeName(type) {
    const types = {
        'doc-in': 'หนังสือรับ',
        'doc-out': 'หนังสือส่ง',
        'doc-all': 'เอกสารทั้งหมด',
        'doc-external': 'หนังสือภายนอก',
        'doc-internal': 'หนังสือภายใน',
        'doc-stamped': 'หนังสือประทับตรา',
        'doc-command': 'คำสั่ง',
        'doc-regulation': 'ระเบียบ',
        'doc-rule': 'ข้อบังคับ',
        'doc-announcement': 'ประกาศ',
        'doc-statement': 'แถลงการณ์',
        'doc-news': 'ข่าว',
        'doc-certification': 'หนังสือรับรอง',
        'doc-meeting-report': 'รายงานการประชุม',
        'doc-memo': 'บันทึก',
        'doc-other': 'หนังสืออื่น',
        'doc-circular': 'หนังสือเวียน (ข้อมูลเดิม)',
        'doc-urgent': 'หนังสือด่วน (ข้อมูลเดิม)',
        'doc-general': 'เอกสารทั่วไป (ข้อมูลเดิม)'
    };
    return types[type] || 'เอกสาร';
}

function getDocumentsByType(type) {
    if (type === 'doc-all') return appDocuments;
    // Keep legacy records discoverable without changing their stored type automatically.
    const legacyOtherTypes = ['doc-other', 'doc-general', 'doc-circular', 'doc-urgent'];
    return appDocuments.filter(doc => type === 'doc-other'
        ? legacyOtherTypes.includes(doc.type)
        : doc.type === type);
}

function renderDocList(type) {
    document.getElementById('doc-page-title').innerText = getDocTypeName(type);
    const addDocumentAction = document.getElementById('add-document-action');
    if (addDocumentAction) {
        addDocumentAction.style.display = (currentUser && currentUser.role === 'admin' && type !== 'doc-all') ? 'block' : 'none';
    }
    const tbody = document.getElementById('doc-table-body');
    const pagination = document.getElementById('mobile-doc-pagination');
    tbody.innerHTML = '';

    const filteredDocs = getDocumentsByType(type);
    const isMobile = window.innerWidth <= 768;
    
    if(filteredDocs.length === 0) {
        tbody.innerHTML = '<tr class="doc-empty"><td colspan="7" class="text-center text-muted py-4">ไม่มีข้อมูลเอกสาร</td></tr>';
        if (pagination) pagination.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredDocs.length / MOBILE_DOC_PAGE_SIZE);
    if (!isMobile) mobileDocPage = 1;
    mobileDocPage = Math.max(1, Math.min(mobileDocPage, totalPages));
    const startIndex = isMobile ? (mobileDocPage - 1) * MOBILE_DOC_PAGE_SIZE : 0;
    const visibleDocs = isMobile
        ? filteredDocs.slice(startIndex, startIndex + MOBILE_DOC_PAGE_SIZE)
        : filteredDocs;
            
    visibleDocs.forEach(doc => {
                const tr = document.createElement('tr');
                let badgeColor = 'bg-secondary';
                if(doc.status === 'ใหม่') badgeColor = 'bg-danger';
                if(doc.status === 'รออนุมัติ' || doc.status === 'แก้ไขแล้ว') badgeColor = 'bg-warning text-dark';
                if(doc.status === 'ประกาศ' || doc.status === 'อ่านแล้ว') badgeColor = 'bg-success';
 
                let actionBtns = `<button class="btn btn-sm btn-info text-white me-1 mb-1" title="ดูไฟล์" onclick="previewDoc('${doc.id}')"><i class="fas fa-eye"></i></button>`;
                actionBtns += `<button class="btn btn-sm btn-success text-white me-1 mb-1" title="ดาวน์โหลดไฟล์" onclick="downloadDoc('${doc.id}')"><i class="fas fa-download"></i></button>`;
                
                if (currentUser && currentUser.role === 'admin') {
                    actionBtns += `
                        <button class="btn btn-sm btn-warning text-dark me-1 mb-1" title="แก้ไข" onclick="editDoc('${doc.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger mb-1" title="ลบ" onclick="deleteDoc('${doc.id}')"><i class="fas fa-trash"></i></button>
                    `;
                }
 
                const deptCell = doc.department
                    ? `<span class="badge bg-secondary d-block mb-1">${doc.department}</span>${doc.subDepartment ? `<span class="badge bg-light text-dark border">${doc.subDepartment}</span>` : ''}`
                    : '-';
 
                tr.innerHTML = `
                    <td data-label="เลขที่เอกสาร" class="fw-bold">${doc.no}</td>
                    <td data-label="เรื่อง">${doc.title}</td>
                    <td data-label="วันที่">${doc.date}</td>
                    <td data-label="จาก/ถึง">${doc.from}</td>
                    <td data-label="ฝ่าย/งาน">${deptCell}</td>
                    <td data-label="สถานะ"><span class="status-badge ${badgeColor}">${doc.status}</span></td>
                    <td data-label="จัดการ">${actionBtns}</td>
                `;
        tbody.appendChild(tr);
    });

    if (!pagination) return;
    if (!isMobile || totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    const lastIndex = Math.min(startIndex + MOBILE_DOC_PAGE_SIZE, filteredDocs.length);
    pagination.innerHTML = `
        <span class="pagination-summary">แสดง ${startIndex + 1}–${lastIndex} จาก ${filteredDocs.length} รายการ</span>
        <span class="pagination-actions">
            <button class="btn btn-outline-secondary btn-sm" type="button" onclick="changeMobileDocPage(${mobileDocPage - 1})" ${mobileDocPage === 1 ? 'disabled' : ''}>ก่อนหน้า</button>
            <button class="btn btn-primary btn-sm" type="button" onclick="changeMobileDocPage(${mobileDocPage + 1})" ${mobileDocPage === totalPages ? 'disabled' : ''}>ถัดไป</button>
        </span>`;
}

function changeMobileDocPage(page) {
    mobileDocPage = page;
    renderDocList(currentDocType);
    document.getElementById('view-doc-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
 
        function openDocModal() {
            if (currentDocType === 'doc-all') {
                Swal.fire('เลือกประเภทเอกสาร', 'กรุณาเลือกประเภทเอกสารจากเมนูด้านซ้ายก่อนเพิ่มรายการใหม่', 'info');
                return;
            }
            document.getElementById('docId').value = '';
            document.getElementById('docNo').value = '';
            document.getElementById('docTitle').value = '';
            document.getElementById('docDate').value = '';
            document.getElementById('docFrom').value = '';
            document.getElementById('docDepartment').value = '';
            populateDocAssignee();
            document.getElementById('docStatus').value = 'ใหม่';
            document.getElementById('docDueDate').value = '';
            document.getElementById('docFollowupNote').value = '';
            populateSubDeptSelect(document.getElementById('docSubDepartment'), '', '-- เลือกฝ่ายก่อน --', false, true);
            document.getElementById('docSubDepartmentOther').value = '';
            document.getElementById('docSubDepartmentOtherWrap').style.display = 'none';
            document.getElementById('docFile').value = '';
            document.getElementById('docModalLabel').innerText = 'เพิ่ม ' + getDocTypeName(currentDocType);
            docModal.show();
        }
 
        function editDoc(id) {
            const doc = appDocuments.find(d => d.id == id);
            if(doc) {
                document.getElementById('docId').value = doc.id;
                document.getElementById('docNo').value = doc.no;
                document.getElementById('docTitle').value = doc.title;
                document.getElementById('docDate').value = doc.date; 
                document.getElementById('docFrom').value = doc.from;
                document.getElementById('docDepartment').value = doc.department || '';
                populateDocAssignee(doc.assignee || '');
                document.getElementById('docStatus').value = doc.status || 'ใหม่';
                document.getElementById('docDueDate').value = doc.dueDate || '';
                document.getElementById('docFollowupNote').value = doc.followupNote || '';
                populateSubDeptSelect(document.getElementById('docSubDepartment'), doc.department || '', '-- เลือกฝ่ายก่อน --', false, true);
 
                const subSelect = document.getElementById('docSubDepartment');
                const knownSubs = (doc.department && appDepartments[doc.department]) ? appDepartments[doc.department] : [];
                const otherWrap = document.getElementById('docSubDepartmentOtherWrap');
                const otherInput = document.getElementById('docSubDepartmentOther');
 
                if (doc.subDepartment && !knownSubs.includes(doc.subDepartment)) {
                    subSelect.value = '__other__';
                    otherWrap.style.display = 'block';
                    otherInput.value = doc.subDepartment;
                } else {
                    subSelect.value = doc.subDepartment || '';
                    otherWrap.style.display = 'none';
                    otherInput.value = '';
                }
 
                document.getElementById('docModalLabel').innerText = 'แก้ไข ' + getDocTypeName(doc.type);
                docModal.show();
            }
        }
 
        function getBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });
        }
 
        async function saveDocument(e) {
            if (e && e.preventDefault) e.preventDefault();
 
            const departmentVal = document.getElementById('docDepartment').value;
            if (!departmentVal) {
                return Swal.fire('แจ้งเตือน', 'กรุณาเลือกฝ่ายที่รับผิดชอบเอกสารนี้', 'warning');
            }
            let subDepartmentVal = document.getElementById('docSubDepartment').value;
            if (!subDepartmentVal) {
                return Swal.fire('แจ้งเตือน', 'กรุณาเลือกงานภายในฝ่ายที่รับผิดชอบเอกสารนี้', 'warning');
            }
            if (subDepartmentVal === '__other__') {
                const otherVal = document.getElementById('docSubDepartmentOther').value.trim();
                if (!otherVal) {
                    return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่องาน', 'warning');
                }
                subDepartmentVal = otherVal;
            }
            
            const fileInput = document.getElementById('docFile');
            const docId = document.getElementById('docId').value;
            
            let docObj = {
                id: docId,
                type: currentDocType,
                no: document.getElementById('docNo').value,
                title: document.getElementById('docTitle').value,
                date: document.getElementById('docDate').value,
                from: document.getElementById('docFrom').value,
                department: departmentVal,
                subDepartment: subDepartmentVal,
                status: document.getElementById('docStatus').value,
                assignee: document.getElementById('docAssignee').value,
                dueDate: document.getElementById('docDueDate').value,
                followupNote: document.getElementById('docFollowupNote').value.trim(),
                createdBy: currentUser.username,
                existingFileUrl: ""
            };
 
            if(docId) {
                const existingDoc = appDocuments.find(d => d.id == docId);
                if(existingDoc) docObj.existingFileUrl = existingDoc.fileUrl;
            }
 
            Swal.fire({ title: 'กำลังบันทึกข้อมูลและอัปโหลดไฟล์...', text: 'กรุณารอสักครู่ (อาจใช้เวลา 10-30 วินาที)', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
 
            try {
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    docObj.fileData = await getBase64(file);
                    docObj.fileName = file.name;
                    docObj.mimeType = file.type;
                }
 
                gsRun('saveDocumentRecord', [docObj], function(res) {
                    if(res.status === 'success') {
                        gsRun('getInitialData', [], function(data) {
                            appDocuments = data.docs;
                            docModal.hide();
                            renderDocList(currentDocType);
                            populateYearOptions();
                            updateDashboard();
                            Swal.fire('สำเร็จ', 'บันทึกข้อมูลและอัปโหลดไฟล์เรียบร้อยแล้ว', 'success');
                        });
                    } else {
                        Swal.fire('ข้อผิดพลาด', res.message, 'error');
                    }
                }, { timeoutMs: 40000 });
 
            } catch (err) {
                Swal.fire('ข้อผิดพลาด', 'มีปัญหาในการอ่านไฟล์: ' + err, 'error');
            }
        }
 
        function deleteDoc(id) {
            Swal.fire({
                title: 'ยืนยันการลบ?', text: "คุณจะไม่สามารถกู้คืนเอกสารนี้ได้!", icon: 'warning',
                showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ใช่, ลบเลย!'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                    
                    gsRun('deleteDocument', [id, currentUser.username], function(res) {
                        if(res.status === 'success') {
                            appDocuments = appDocuments.filter(d => d.id != id);
                            renderDocList(currentDocType);
                            updateDashboard();
                            Swal.fire('ลบแล้ว!', 'เอกสารถูกลบออกจากระบบ', 'success');
                        } else {
                            Swal.fire('ข้อผิดพลาด', res.message, 'error');
                        }
                    });
                }
            });
        }
 
        function previewDoc(id) {
            const doc = appDocuments.find(d => d.id == id);
            if (doc && doc.fileUrl && doc.fileUrl.trim() !== '') {
                window.open(doc.fileUrl, '_blank');
            } else {
                Swal.fire({
                    title: 'ไม่พบไฟล์แนบ', text: 'เอกสารนี้ยังไม่ได้อัปโหลดไฟล์ในระบบ', icon: 'warning', confirmButtonText: 'ตกลง'
                });
            }
        }

        function populateDocAssignee(selectedValue) {
            const select = document.getElementById('docAssignee');
            if (!select) return;
            const users = Array.isArray(appUsers) ? appUsers : [];
            const options = users.map(user => {
                const value = user.username || user.name || '';
                const label = user.name ? `${user.name}${user.username ? ' (' + user.username + ')' : ''}` : value;
                return `<option value="${escapeDashboardText(value)}">${escapeDashboardText(label)}</option>`;
            }).join('');
            select.innerHTML = '<option value="">-- ยังไม่ระบุ --</option>' + options;
            select.value = selectedValue || '';
        }

        // ให้ผู้ใช้ทุกบทบาทดาวน์โหลดไฟล์แนบได้จากคอลัมน์ "จัดการ"
        function downloadDoc(id) {
            const doc = appDocuments.find(d => d.id == id);
            if (!doc || !doc.fileUrl || doc.fileUrl.trim() === '') {
                Swal.fire({
                    title: 'ไม่พบไฟล์แนบ',
                    text: 'เอกสารนี้ยังไม่ได้อัปโหลดไฟล์ในระบบ',
                    icon: 'warning',
                    confirmButtonText: 'ตกลง'
                });
                return;
            }

            // แปลงลิงก์ Google Drive เป็นลิงก์ดาวน์โหลดโดยตรง
            // จึงใช้ได้กับ Web App ที่ Deploy อยู่ แม้ฝั่ง GS ยังไม่มี action ดาวน์โหลด
            const fileIdMatch = doc.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || doc.fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (!fileIdMatch) {
                Swal.fire('ดาวน์โหลดไม่สำเร็จ', 'ลิงก์ไฟล์แนบไม่ถูกต้อง', 'error');
                return;
            }

            const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileIdMatch[1]}&export=download&confirm=t`;
            window.open(downloadUrl, '_blank');
        }
 
        function performSearch() {
            const keyword = document.getElementById('searchInput').value.toLowerCase();
            const type = document.getElementById('searchType').value;
            const dept = document.getElementById('searchDept').value;
            const subDept = document.getElementById('searchSubDept').value;
            const resultsDiv = document.getElementById('search-results');
            
            if(!keyword) return Swal.fire('แจ้งเตือน', 'กรุณาระบุคำค้นหา', 'warning');
 
            const results = appDocuments.filter(d => {
                const matchKeyword = d.no.toLowerCase().includes(keyword) || d.title.toLowerCase().includes(keyword);
                const matchType = (type === 'all') ? true : (type === 'doc-other'
                    ? ['doc-other', 'doc-general', 'doc-circular', 'doc-urgent'].includes(d.type)
                    : d.type === type);
                const matchDept = (dept === 'all') ? true : (d.department === dept);
                const matchSubDept = (subDept === 'all') ? true : (d.subDepartment === subDept);
                return matchKeyword && matchType && matchDept && matchSubDept;
            });
 
            if(results.length > 0) {
                let html = `<div class="alert alert-success">พบข้อมูล ${results.length} รายการ</div><ul class="list-group">`;
                results.forEach(r => {
                    const deptText = r.department ? '| ' + r.department + (r.subDepartment ? ' - ' + r.subDepartment : '') : '';
                    html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                        <div><strong>${r.no}</strong> - ${r.title} <br>
                        <small class="text-muted">${getDocTypeName(r.type)} ${deptText} | วันที่: ${r.date}</small></div>
                        <button class="btn btn-sm btn-info text-white" onclick="previewDoc('${r.id}')">ดูไฟล์</button>
                    </li>`;
                });
                html += '</ul>';
                resultsDiv.innerHTML = html;
            } else {
                resultsDiv.innerHTML = '<div class="alert alert-warning">ไม่พบเอกสารที่ค้นหา</div>';
            }
        }
 
        function renderUserList() {
            const tbody = document.getElementById('user-table-body');
            tbody.innerHTML = '';
            
            appUsers.forEach(u => {
                const tr = document.createElement('tr');
                const roleBadge = u.role === 'admin' ? '<span class="badge bg-danger">Admin</span>' : '<span class="badge bg-info text-dark">User</span>';
                
                tr.innerHTML = `
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${roleBadge}</td>
                    <td><span class="badge bg-success">${u.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-warning text-dark me-1" onclick="editUser('${u.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
 
        function openUserModal() {
            document.getElementById('userId').value = '';
            document.getElementById('userName').value = '';
            document.getElementById('userUsername').value = '';
            document.getElementById('userPassword').value = '';
            document.getElementById('userRole').value = 'user';
            document.getElementById('userModalLabel').innerText = 'เพิ่มผู้ใช้ใหม่';
            userModal.show();
        }
 
        function editUser(id) {
            const user = appUsers.find(u => u.id == id);
            if(user) {
                document.getElementById('userId').value = user.id;
                document.getElementById('userName').value = user.name;
                document.getElementById('userUsername').value = user.username;
                document.getElementById('userPassword').value = user.password;
                document.getElementById('userRole').value = user.role;
                document.getElementById('userModalLabel').innerText = 'แก้ไขข้อมูลผู้ใช้';
                userModal.show();
            }
        }
 
        function saveUser(e) {
            if (e && e.preventDefault) e.preventDefault();
            Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
            
            const userObj = {
                id: document.getElementById('userId').value,
                name: document.getElementById('userName').value,
                username: document.getElementById('userUsername').value,
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value,
                status: 'Active'
            };
 
            gsRun('saveUserRecord', [userObj, currentUser.username], function(res) {
                if(res.status === 'success') {
                    gsRun('getUsers', [], function(users) {
                        appUsers = users;
                        userModal.hide();
                        renderUserList();
                        Swal.fire('สำเร็จ', 'บันทึกข้อมูลผู้ใช้เรียบร้อย', 'success');
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', res.message, 'error');
                }
            });
        }
 
        function deleteUser(id) {
            Swal.fire({
                title: 'ยืนยันลบผู้ใช้?', icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#d33', confirmButtonText: 'ลบเลย!'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
                    
                    gsRun('deleteUser', [id, currentUser.username], function(res) {
                        if(res.status === 'success') {
                            appUsers = appUsers.filter(u => u.id != id);
                            renderUserList();
                            Swal.fire('ลบแล้ว!', '', 'success');
                        } else {
                            Swal.fire('ผิดพลาด', res.message, 'error');
                        }
                    });
                }
            });
        }
 
        function downloadUserTemplate() {
            const wsData = [
                ['ชื่อ-นามสกุล', 'ชื่อผู้ใช้ (Username)', 'รหัสผ่าน', 'สิทธิ์ (admin/user)'],
                ['สมชาย ใจดี', 'somchai.j', '123456', 'user'],
                ['สมหญิง รักงาน', 'somying.r', '123456', 'admin']
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 15 }, { wch: 18 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'ผู้ใช้งาน');
            XLSX.writeFile(wb, 'แบบฟอร์มนำเข้าผู้ใช้งาน.xlsx');
        }
 
        function triggerImportUser() {
            document.getElementById('importUserFile').click();
        }
 
        function handleImportFile(e) {
            const file = e.target.files[0];
            if (!file) return;
 
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                    processImportedUsers(rows);
                } catch (err) {
                    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบไฟล์: ' + err, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
 
            e.target.value = '';
        }
 
        function processImportedUsers(rows) {
            const parsed = [];
            const errors = [];
 
            rows.forEach((row, idx) => {
                const rowNo = idx + 2;
                const name = String(row['ชื่อ-นามสกุล'] ?? row['ชื่อ'] ?? '').trim();
                const username = String(row['ชื่อผู้ใช้ (Username)'] ?? row['Username'] ?? row['ชื่อผู้ใช้'] ?? '').trim();
                const password = String(row['รหัสผ่าน'] ?? row['Password'] ?? '').trim();
                let role = String(row['สิทธิ์ (admin/user)'] ?? row['Role'] ?? row['สิทธิ์'] ?? 'user').trim().toLowerCase();
                if (role !== 'admin') role = 'user';
 
                if (!name || !username || !password) {
                    errors.push(`แถวที่ ${rowNo}: ข้อมูลไม่ครบ (ต้องมีชื่อ, username และรหัสผ่าน)`);
                    return;
                }
 
                const isDuplicate = appUsers.some(u => u.username.toLowerCase() === username.toLowerCase())
                    || parsed.some(u => u.username.toLowerCase() === username.toLowerCase());
                if (isDuplicate) {
                    errors.push(`แถวที่ ${rowNo}: username "${username}" ซ้ำกับที่มีอยู่แล้ว จึงข้ามแถวนี้`);
                    return;
                }
 
                parsed.push({ name, username, password, role, status: 'Active' });
            });
 
            if (parsed.length === 0) {
                Swal.fire({
                    title: 'ไม่พบข้อมูลที่นำเข้าได้',
                    html: errors.length ? errors.join('<br>') : 'กรุณาตรวจสอบว่าไฟล์ตรงกับฟอร์มที่ดาวน์โหลดไป',
                    icon: 'error'
                });
                return;
            }
 
            pendingImportUsers = parsed;
            renderImportPreview(parsed, errors);
            importPreviewModal.show();
        }
 
        function renderImportPreview(parsed, errors) {
            document.getElementById('importPreviewCount').innerText = parsed.length;
 
            const tbody = document.getElementById('importPreviewBody');
            tbody.innerHTML = parsed.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.username}</td>
                    <td>${u.role === 'admin' ? '<span class="badge bg-danger">Admin</span>' : '<span class="badge bg-info">User</span>'}</td>
                </tr>
            `).join('');
 
            const errBox = document.getElementById('importPreviewErrors');
            if (errors.length > 0) {
                errBox.style.display = 'block';
                errBox.innerHTML = '<div class="alert alert-warning small mb-0"><strong><i class="fas fa-triangle-exclamation"></i> ข้ามแถวที่มีปัญหา ' + errors.length + ' แถว:</strong><br>' + errors.join('<br>') + '</div>';
            } else {
                errBox.style.display = 'none';
                errBox.innerHTML = '';
            }
        }
 
        function confirmImportUsers() {
            if (pendingImportUsers.length === 0) return;
            importPreviewModal.hide();
 
            Swal.fire({
                title: 'กำลังนำเข้าผู้ใช้งาน...',
                text: `กำลังบันทึก ${pendingImportUsers.length} รายการ`,
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading() }
            });
 
            gsRun('importUserRecords', [pendingImportUsers, currentUser.username], function(res) {
                if (res.status === 'success') {
                    gsRun('getUsers', [], function(users) {
                        appUsers = users;
                        renderUserList();
                        pendingImportUsers = [];
                        Swal.fire('สำเร็จ', 'นำเข้าผู้ใช้งานเรียบร้อยแล้ว', 'success');
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', res.message, 'error');
                }
            }, { timeoutMs: 40000 });
        }
 
        function saveSettings(e) {
            if (e && e.preventDefault) e.preventDefault();
 
            Swal.fire({ title: 'กำลังบันทึกการตั้งค่า...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
 
            const logoInputEl = document.getElementById('settingLogoUrl');
            const settingsObj = {
                orgName: document.getElementById('settingOrgName').value,
                theme: currentThemeKey,
                logoUrl: logoInputEl ? (logoInputEl.value.trim() || DEFAULT_LOGO_URL) : DEFAULT_LOGO_URL
            };
 
            gsRun('saveSystemSettings', [settingsObj], function(res) {
                if (res.status === 'success') {
                    applySystemSettings(settingsObj);
                    Swal.fire('สำเร็จ', 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success');
                } else {
                    Swal.fire('ข้อผิดพลาด', res.message, 'error');
                }
            });
        }
 
        const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const BE_OFFSET = 543;
 
        function parseDocDate(dateStr) {
            if (!dateStr) return null;
            const dt = new Date(dateStr);
            if (isNaN(dt.getTime())) return null;
            return { year: dt.getFullYear(), month: dt.getMonth() };
        }
 
        function populateYearOptions() {
            const yearSelect = document.getElementById('dashYear');
            const previousValue = yearSelect.value || 'all';
 
            const yearsCE = new Set();
            appDocuments.forEach(d => {
                const parsed = parseDocDate(d.date);
                if (parsed) yearsCE.add(parsed.year);
            });
            const currentCE = new Date().getFullYear();
            yearsCE.add(currentCE);
 
            const sortedYearsCE = Array.from(yearsCE).sort((a, b) => b - a);
 
            yearSelect.innerHTML = '<option value="all">ทุกปี</option>';
            sortedYearsCE.forEach(y => {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = 'พ.ศ. ' + (y + BE_OFFSET);
                yearSelect.appendChild(opt);
            });
 
            const stillExists = Array.from(yearSelect.options).some(o => o.value == previousValue);
            yearSelect.value = stillExists ? previousValue : String(currentCE);
        }
 
        function resetDashboardFilter() {
            document.getElementById('dashMonth').value = 'all';
            populateYearOptions();
            document.getElementById('dashYear').value = 'all';
            document.getElementById('dashDept').value = 'all';
            populateSubDeptSelect(document.getElementById('dashSubDept'), '', '', true);
            updateDashboard();
        }

        function openDashboardSection(menuId) {
            const menuItem = Array.from(document.querySelectorAll('#sidebar li')).find(li => li.getAttribute('onclick') === `switchMenu('${menuId}', this)`);
            switchMenu(menuId, menuItem || null);
        }

        function openDashboardDocument(id) {
            const doc = appDocuments.find(item => String(item.id) === String(id));
            if (!doc) return;
            if (currentUser && currentUser.role === 'admin') {
                currentDocType = doc.type;
                editDoc(doc.id);
            } else {
                openDashboardSection(doc.type);
            }
        }

        function escapeDashboardText(value) {
            return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
        }

        function getDashboardStatusClass(status) {
            if (status === 'ใหม่') return 'bg-danger';
            if (status === 'รออนุมัติ' || status === 'แก้ไขแล้ว' || status === 'ส่งกลับแก้ไข') return 'bg-warning text-dark';
            if (status === 'อนุมัติแล้ว' || status === 'ประกาศ' || status === 'อ่านแล้ว' || status === 'ปิดงาน') return 'bg-success';
            return 'bg-secondary';
        }

        function renderDashboardWorkList(targetId, docs, emptyMessage) {
            const target = document.getElementById(targetId);
            if (!target) return;
            if (!docs.length) {
                target.innerHTML = `<li class="dashboard-empty"><i class="fas fa-circle-check d-block fs-4 mb-2"></i>${emptyMessage}</li>`;
                return;
            }
            target.innerHTML = docs.map(doc => {
                const safeTitle = escapeDashboardText(doc.title || 'ไม่ระบุเรื่อง');
                const safeNo = escapeDashboardText(doc.no || '-');
                const safeDate = escapeDashboardText(doc.date || '-');
                const safeStatus = escapeDashboardText(doc.status || 'ไม่ระบุสถานะ');
                const safeAssignee = escapeDashboardText(doc.assignee || 'ยังไม่ระบุผู้รับผิดชอบ');
                const safeDueDate = escapeDashboardText(doc.dueDate || 'ยังไม่กำหนดวันครบกำหนด');
                const icon = doc.type === 'doc-urgent' ? 'fa-bolt' : 'fa-file-lines';
                const idArg = JSON.stringify(String(doc.id));
                const actionLabel = currentUser && currentUser.role === 'admin' ? 'จัดการงาน' : 'เปิดเอกสาร';
                return `<li>
                    <span class="dashboard-work-icon" data-document-type="${doc.type}"><i class="fas ${icon}"></i></span>
                    <div class="dashboard-work-text"><div class="dashboard-work-title" title="${safeTitle}">${safeTitle}</div><div class="dashboard-work-meta">${safeNo} · ${safeDate} · ${safeAssignee}${doc.dueDate ? ' · ครบกำหนด ' + safeDueDate : ''}</div></div>
                    <span class="status-badge ${getDashboardStatusClass(doc.status)}">${safeStatus}</span>
                    <button class="btn btn-sm btn-light" onclick='openDashboardDocument(${idArg})' title="${actionLabel}"><i class="fas ${currentUser && currentUser.role === 'admin' ? 'fa-pen-to-square' : 'fa-arrow-right'}"></i></button>
                </li>`;
            }).join('');
        }

        function renderDashboardWorkPanels(filteredDocs) {
            const pendingStatuses = ['ใหม่', 'รออนุมัติ', 'แก้ไขแล้ว'];
            const pendingDocs = filteredDocs.filter(doc => pendingStatuses.includes(doc.status));
            const byNewestDate = (a, b) => {
                const aTime = new Date(a.date || 0).getTime() || 0;
                const bTime = new Date(b.date || 0).getTime() || 0;
                return bTime - aTime;
            };
            const latestDocs = [...filteredDocs].sort(byNewestDate).slice(0, 5);
            const completedStatuses = ['อนุมัติแล้ว', 'ประกาศ', 'อ่านแล้ว', 'ปิดงาน'];
            const urgentDocs = filteredDocs
                .filter(doc => doc.type === 'doc-urgent' && !completedStatuses.includes(doc.status))
                .sort((a, b) => {
                    const aDue = new Date(a.dueDate || '9999-12-31').getTime();
                    const bDue = new Date(b.dueDate || '9999-12-31').getTime();
                    return aDue - bDue || byNewestDate(a, b);
                }).slice(0, 4);

            document.getElementById('dash-pending-count').innerText = pendingDocs.length;
            document.getElementById('dash-urgent-followup-count').innerText = urgentDocs.length;
            document.getElementById('dash-latest-count').innerText = latestDocs.length;
            renderDashboardWorkList('dash-latest-list', latestDocs, 'ยังไม่มีเอกสารในตัวกรองนี้');
            renderDashboardWorkList('dash-urgent-list', urgentDocs, 'ไม่มีเอกสารด่วนที่ต้องติดตาม');
        }

        function updateDashboard() {
            const monthVal = document.getElementById('dashMonth').value;
            const yearVal = document.getElementById('dashYear').value;
            const deptVal = document.getElementById('dashDept') ? document.getElementById('dashDept').value : 'all';
            const subDeptVal = document.getElementById('dashSubDept') ? document.getElementById('dashSubDept').value : 'all';
 
            const filteredDocs = appDocuments.filter(d => {
                const parsed = parseDocDate(d.date);
                if (!parsed) return false;
                const yearMatch = (yearVal === 'all') ? true : parsed.year === parseInt(yearVal);
                const monthMatch = (monthVal === 'all') ? true : (parsed.month + 1) === parseInt(monthVal);
                const deptMatch = (deptVal === 'all') ? true : (d.department === deptVal);
                const subDeptMatch = (subDeptVal === 'all') ? true : (d.subDepartment === subDeptVal);
                return yearMatch && monthMatch && deptMatch && subDeptMatch;
            });
 
            const inCount = filteredDocs.filter(d => d.type === 'doc-in').length;
            const outCount = filteredDocs.filter(d => d.type === 'doc-out').length;
            const externalCount = filteredDocs.filter(d => d.type === 'doc-external').length;
            const internalCount = filteredDocs.filter(d => d.type === 'doc-internal').length;
            const stampedCount = filteredDocs.filter(d => d.type === 'doc-stamped').length;
            const orderCount = filteredDocs.filter(d => ['doc-command', 'doc-regulation', 'doc-rule'].includes(d.type)).length;
            const publicCount = filteredDocs.filter(d => ['doc-announcement', 'doc-statement', 'doc-news'].includes(d.type)).length;
            const evidenceCount = filteredDocs.filter(d => ['doc-certification', 'doc-meeting-report', 'doc-memo', 'doc-other', 'doc-general', 'doc-circular', 'doc-urgent'].includes(d.type)).length;
 
            document.getElementById('stat-in').innerText = inCount;
            document.getElementById('stat-out').innerText = outCount;
            document.getElementById('stat-external').innerText = externalCount;
            document.getElementById('stat-internal').innerText = internalCount;
            document.getElementById('stat-stamped').innerText = stampedCount;
            document.getElementById('stat-order').innerText = orderCount;
            document.getElementById('stat-public').innerText = publicCount;
            document.getElementById('stat-evidence').innerText = evidenceCount;
            document.getElementById('stat-total').innerText = filteredDocs.length;
            renderDashboardWorkPanels(filteredDocs);

            const yearDocs = appDocuments.filter(d => {
                const parsed = parseDocDate(d.date);
                if (!parsed) return false;
                const yearMatch = (yearVal === 'all') ? true : parsed.year === parseInt(yearVal);
                const deptMatch = (deptVal === 'all') ? true : (d.department === deptVal);
                const subDeptMatch = (subDeptVal === 'all') ? true : (d.subDepartment === subDeptVal);
                return yearMatch && deptMatch && subDeptMatch;
            });
 
            const monthlyByType = {
                'doc-in': Array(12).fill(0),
                'doc-out': Array(12).fill(0),
                'doc-external': Array(12).fill(0),
                'doc-internal': Array(12).fill(0),
                'doc-stamped': Array(12).fill(0),
                'doc-order-group': Array(12).fill(0),
                'doc-public-group': Array(12).fill(0),
                'doc-evidence-group': Array(12).fill(0)
            };
            yearDocs.forEach(d => {
                const parsed = parseDocDate(d.date);
                if (!parsed) return;
                const groupType = ['doc-command', 'doc-regulation', 'doc-rule'].includes(d.type) ? 'doc-order-group'
                    : ['doc-announcement', 'doc-statement', 'doc-news'].includes(d.type) ? 'doc-public-group'
                    : ['doc-certification', 'doc-meeting-report', 'doc-memo', 'doc-other', 'doc-general', 'doc-circular', 'doc-urgent'].includes(d.type) ? 'doc-evidence-group'
                    : d.type;
                if (monthlyByType[groupType]) {
                    monthlyByType[groupType][parsed.month]++;
                }
            });
 
            const yearLabel = (yearVal === 'all') ? 'ทุกปี' : ('พ.ศ. ' + (parseInt(yearVal) + BE_OFFSET));
            const monthLabel = (monthVal === 'all') ? '' : ' - เดือน' + document.getElementById('dashMonth').selectedOptions[0].text;
            const deptLabel = (deptVal === 'all') ? '' : ' - ' + deptVal + (subDeptVal !== 'all' ? ' (' + subDeptVal + ')' : '');
 
            document.getElementById('barChartTitle').innerText = 'สถิติเอกสารรายเดือน (' + yearLabel + deptLabel + ')';
            document.getElementById('pieChartTitle').innerText = 'สัดส่วนประเภทเอกสาร (' + yearLabel + monthLabel + deptLabel + ')';
 
            renderCharts(monthlyByType, inCount, outCount, externalCount, internalCount, stampedCount, orderCount, publicCount, evidenceCount);
        }

        function renderCharts(monthlyByType, inC, outC, externalC, internalC, stampedC, orderC, publicC, evidenceC) {
            if(barChartInstance) barChartInstance.destroy();
            if(pieChartInstance) pieChartInstance.destroy();

            const labels = ['รับ', 'ส่ง', 'ภายนอก', 'ภายใน', 'ประทับตรา', 'สั่งการ', 'ประชาสัมพันธ์', 'หลักฐานราชการ'];
            // ชุดสีโทนเย็นเพื่อให้อ่านข้อมูลได้สบายตาและแยกประเภทได้ชัดเจน
            const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#1CECFF', '#795548', '#F43F5E', '#FF6F00', '#FDD835'];
            const highlightColors = ['#93C5FD', '#6EE7B7', '#C4B5FD', '#A5F3FC', '#BCAAA4', '#FDA4AF', '#FFD180', '#FFF59D'];
            const commonDataset = {
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 42,
                barPercentage: 0.72,
                categoryPercentage: 0.74
            };

            const ctxBar = document.getElementById('barChart').getContext('2d');
            const barGradients = colors.map((color, index) => {
                const gradient = ctxBar.createLinearGradient(0, 0, 0, 260);
                gradient.addColorStop(0, highlightColors[index]);
                gradient.addColorStop(1, color);
                return gradient;
            });
            barChartInstance = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: THAI_MONTHS_SHORT,
                    datasets: [
                        { label: labels[0], data: monthlyByType['doc-in'], backgroundColor: barGradients[0], ...commonDataset },
                        { label: labels[1], data: monthlyByType['doc-out'], backgroundColor: barGradients[1], ...commonDataset },
                        { label: labels[2], data: monthlyByType['doc-external'], backgroundColor: barGradients[2], ...commonDataset },
                        { label: labels[3], data: monthlyByType['doc-internal'], backgroundColor: barGradients[3], ...commonDataset },
                        { label: labels[4], data: monthlyByType['doc-stamped'], backgroundColor: barGradients[4], ...commonDataset },
                        { label: labels[5], data: monthlyByType['doc-order-group'], backgroundColor: barGradients[5], ...commonDataset },
                        { label: labels[6], data: monthlyByType['doc-public-group'], backgroundColor: barGradients[6], ...commonDataset },
                        { label: labels[7], data: monthlyByType['doc-evidence-group'], backgroundColor: barGradients[7], ...commonDataset }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeOutQuart' },
                    interaction: { mode: 'index', intersect: false },
                    layout: { padding: { top: 12, right: 10, left: 4, bottom: 2 } },
                    plugins: {
                        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 9, boxHeight: 9, padding: 14, font: { family: 'Sarabun', size: 12, weight: '600' } } },
                        tooltip: { backgroundColor: '#172033', padding: 12, cornerRadius: 10, titleFont: { family: 'Sarabun', weight: '700' }, bodyFont: { family: 'Sarabun' }, displayColors: true, caretPadding: 8 }
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Sarabun', size: 12 } }, border: { display: false } },
                        y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: '#64748b', font: { family: 'Sarabun', size: 12 } }, grid: { color: 'rgba(148,163,184,.18)', drawBorder: false }, border: { display: false } }
                    }
                }
            });
 
            const ctxPie = document.getElementById('pieChart').getContext('2d');
            const totalDocuments = inC + outC + externalC + internalC + stampedC + orderC + publicC + evidenceC;
            const doughnutCenterText = {
                id: 'doughnutCenterText',
                afterDraw(chart) {
                    const { ctx, chartArea } = chart;
                    const x = (chartArea.left + chartArea.right) / 2;
                    const y = (chartArea.top + chartArea.bottom) / 2;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#1e3a5f';
                    ctx.font = '700 24px Kanit, Sarabun, sans-serif';
                    ctx.fillText(totalDocuments, x, y - 3);
                    ctx.fillStyle = '#718096';
                    ctx.font = '500 11px Sarabun, sans-serif';
                    ctx.fillText('เอกสารทั้งหมด', x, y + 16);
                    ctx.restore();
                }
            };
            pieChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: [inC, outC, externalC, internalC, stampedC, orderC, publicC, evidenceC],
                        backgroundColor: colors,
                        borderColor: '#ffffff',
                        borderWidth: 4,
                        hoverOffset: 9
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '66%',
                    layout: { padding: { top: 2, bottom: 3 } },
                    plugins: {
                        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: { family: 'Sarabun', size: 12, weight: '600' } } },
                        tooltip: { backgroundColor: '#172033', padding: 12, cornerRadius: 9, titleFont: { family: 'Sarabun', weight: '700' }, bodyFont: { family: 'Sarabun' } }
                    }
                },
                plugins: [doughnutCenterText]
            });
        }
