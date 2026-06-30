/**
 * سامانه نظارت هوشمند مراکز درمانی — بازرسـک گروپ
 * ================================================
 * 
 * تنظیمات اتصال به بک‌اند لاراول:
 * آدرس BASE_URL رو مطابق route های لاراول تغییر بدهید.
 * 
 * روت‌های مورد نیاز در لاراول (methd => URI):
 *   GET  /api/stats          → آمار کلی
 *   GET  /api/filters        → لیست استان‌ها و انواع مراکز
 *   GET  /api/cities         → لیست شهرها بر اساس استان (?province=X)
 *   GET  /api/centers        → لیست مراکز با صفحه‌بندی و فیلتر
 *   GET  /api/audit-forms    → فرم ممیزی بر اساس نوع مرکز (?type=X)
 *   POST /api/audits         → ثبت ممیزی
 *   GET  /api/audits         → جزئیات یک ممیزی (?auditId=X)
 *   POST /api/upload         → آپلود فایل (multipart/form-data)
 */

const API_CONFIG = {
  // آدرس پایه API — این رو به آدرس لاراول خودت تغییر بده
  BASE_URL: '',

  // timeout درخواست‌ها (میلی‌ثانیه)
  TIMEOUT: 30000,
};

(function(){
  'use strict';

  // ===== State =====
  let currentPage = 1;
  let totalResults = 0;
  let totalPagesCount = 0;
  const perPage = 25;
  let centerDataMap = {};
  let currentCenter = null;
  let currentForm = null;
  let currentStep = 0;
  let totalSteps = 0;
  let totalFields = 0;
  let debounceTimer = null;
  let fieldValues = {};
  let uploadedFiles = {};
  let completedSteps = new Set();

  // ===== Shamsi (Jalali) Calendar =====
  const SHAMSI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

  function gregorianToJalali(gy, gm, gd) {
    const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 365*gy + Math.floor((gy2+3)/4) - Math.floor((gy2+99)/100) + Math.floor((gy2+399)/400) - 80 + gd + g_d_m[gm-1];
    jy += 33 * Math.floor(days/12053);
    days %= 12053;
    jy += 4 * Math.floor(days/1461);
    days %= 1461;
    if(days > 365){ jy += Math.floor((days-1)/365); days = (days-1)%365; }
    const jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
    const jd = 1 + ((days < 186) ? (days%31) : ((days-186)%30));
    return [jy, jm, jd];
  }

  function isJalaliLeap(jy) {
    return [1,5,9,13,17,22,26,30].includes(jy % 33);
  }

  function jalaliMonthDays(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
  }

  function getTodayShamsi() {
    const d = new Date();
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
    return { jy, jm, jd };
  }

  function getVisitDate() {
    const t = getTodayShamsi();
    return faNum(t.jy) + '/' + faNum(String(t.jm).padStart(2,'0')) + '/' + faNum(String(t.jd).padStart(2,'0'));
  }

  function createShamsiDatePicker(inputId, savedVal) {
    const today = getTodayShamsi();
    const minYear = 1400;
    const maxYear = today.jy + 1;
    let sv = { jy: today.jy, jm: today.jm, jd: today.jd };
    if (savedVal) {
      const clean = savedVal.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      const parts = clean.split('/');
      if (parts.length === 3) { sv.jy = parseInt(parts[0]); sv.jm = parseInt(parts[1]); sv.jd = parseInt(parts[2]); }
    }
    let yearOpts = '';
    for (let y = maxYear; y >= minYear; y--) yearOpts += '<option value="'+y+'"'+(y===sv.jy?' selected':'')+'>'+faNum(y)+'</option>';
    let monthOpts = '';
    SHAMSI_MONTHS.forEach((m, i) => { monthOpts += '<option value="'+(i+1)+'"'+((i+1)===sv.jm?' selected':'')+'>'+m+'</option>'; });
    const days = jalaliMonthDays(sv.jy, sv.jm);
    let dayOpts = '';
    for (let d = 1; d <= days; d++) dayOpts += '<option value="'+d+'"'+(d===sv.jd?' selected':'')+'>'+faNum(d)+'</option>';
    return '<div id="'+inputId+'" data-track="'+inputId+'" data-date-picker="1" style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">' +
      '<select class="form-select dp-year" style="width:auto;min-width:100px;max-width:120px;padding:.45rem .6rem;font-size:.88rem;">'+yearOpts+'</select>' +
      '<select class="form-select dp-month" style="width:auto;min-width:120px;max-width:160px;padding:.45rem .6rem;font-size:.88rem;">'+monthOpts+'</select>' +
      '<select class="form-select dp-day" style="width:auto;min-width:80px;max-width:100px;padding:.45rem .6rem;font-size:.88rem;">'+dayOpts+'</select>' +
      '<span style="font-size:.82rem;color:var(--muted);margin-right:.3rem;"><i class="bi bi-calendar3"></i> شمسی</span>' +
    '</div>';
  }

  function getShamsiDateValue(el) {
    const y = el.querySelector('.dp-year').value;
    const m = el.querySelector('.dp-month').value;
    const d = el.querySelector('.dp-day').value;
    return faNum(y) + '/' + faNum(String(m).padStart(2,'0')) + '/' + faNum(String(d).padStart(2,'0'));
  }

  // ===== Utilities =====
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const faNum = s => String(s).replace(/\d/g, d => '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'[d]);
  function escHtml(str) { if(!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

  /** ساخت URL کامل برای درخواست API */
  function apiUrl(path, params) {
    let url = API_CONFIG.BASE_URL + path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += '?' + qs;
    }
    return url;
  }

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([loadStats(), loadFilters(), loadCenters(1)]);
    bindEvents();
  });

  // ===== Load Stats =====
  async function loadStats() {
    try {
      const res = await fetch(apiUrl('/stats'));
      const data = await res.json();
      $('#stat-centers').textContent = faNum(data.totalCenters);
      $('#stat-provinces').textContent = faNum(data.provinceCount);
      $('#stat-types').textContent = faNum(data.typeCount);
      $('#stat-audits').textContent = faNum(data.totalAudits);
      renderAuditHistory(data.recentAudits || []);
    } catch(e) { console.error('Stats load error:', e); }
  }

  // ===== Render Audit History =====
  function renderAuditHistory(audits) {
    const list = $('#audit-history-list');
    const countEl = $('#audit-history-count');
    if (!audits || audits.length === 0) {
      list.innerHTML = '<div class="text-center text-muted py-4" style="font-size:.9rem"><i class="bi bi-inbox" style="font-size:1.8rem;opacity:.3"></i><div class="mt-2">هنوز ممیزی ثبت نشده است.</div></div>';
      countEl.textContent = '';
      return;
    }
    countEl.textContent = faNum(audits.length) + ' مورد اخیر';
    list.innerHTML = audits.map(a => {
      const statusCls = a.status === 'submitted' ? 'submitted' : 'draft';
      const statusText = a.status === 'submitted' ? 'ثبت‌شده' : 'پیش‌نویس';
      return '<div class="audit-h-item" data-audit-id="'+a.id+'">' +
        '<div class="audit-h-icon"><i class="bi bi-clipboard2-check"></i></div>' +
        '<div class="audit-h-body">' +
          '<div class="audit-h-name">'+escHtml(a.centerName)+'</div>' +
          '<div class="audit-h-meta">' +
            '<span><i class="bi bi-hospital"></i>'+escHtml(a.centerType)+'</span>' +
            '<span><i class="bi bi-geo-alt"></i>'+escHtml(a.location)+'</span>' +
            '<span><i class="bi bi-calendar3"></i>'+escHtml(a.visitDate)+'</span>' +
            '<span><i class="bi bi-person"></i>'+escHtml(a.assessorName)+'</span>' +
          '</div>' +
        '</div>' +
        '<div class="audit-h-status '+statusCls+'">'+statusText+'</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.audit-h-item').forEach(item => {
      item.addEventListener('click', () => showAuditDetail(parseInt(item.dataset.auditId)));
    });
  }

  // ===== Show Audit Detail Modal =====
  async function showAuditDetail(auditId) {
    const modal = $('#audit-modal');
    const body = $('#modal-body');
    const title = $('#modal-title');
    modal.classList.remove('d-none');
    modal.classList.add('show');
    body.innerHTML = '<div class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div>در حال بارگذاری…</div>';

    try {
      const res = await fetch(apiUrl('/audits', { auditId }));
      const data = await res.json();
      if (!data.audit) { body.innerHTML = '<div class="text-center text-danger py-4">ممیزی یافت نشد.</div>'; return; }
      const a = data.audit;
      title.textContent = 'ممیزی ' + (a.center.center_name || a.center_name || '—');
      let formData = {};
      try { formData = typeof a.formData === 'string' ? JSON.parse(a.formData) : a.formData; } catch(e) {}

      let html = '<div style="margin-bottom:1rem">' +
        '<div style="font-size:.85rem;color:var(--muted);margin-bottom:.6rem;display:flex;gap:1rem;flex-wrap:wrap">' +
          '<span><i class="bi bi-hospital"></i> '+escHtml(a.center.type)+'</span>' +
          '<span><i class="bi bi-geo-alt"></i> '+escHtml(a.center.province)+' · '+escHtml(a.center.city)+'</span>' +
        '</div>' +
        '<div style="font-size:.85rem;color:var(--muted);display:flex;gap:1rem;flex-wrap:wrap">' +
          '<span><i class="bi bi-calendar3"></i> '+escHtml(a.visitDate)+'</span>' +
          '<span><i class="bi bi-person"></i> '+escHtml(a.assessorName)+'</span>' +
        '</div>' +
      '</div>';

      if (Array.isArray(formData.rules)) {
        formData.rules.forEach((rule, ri) => {
          html += '<div class="rule-card" style="margin-bottom:.8rem"><div class="rc-head"><div class="rc-num">'+faNum(ri+1)+'</div><div class="rc-rule">'+escHtml(rule.rule)+'</div></div><div class="rc-body">';
          if (Array.isArray(rule.fields)) {
            rule.fields.forEach(f => {
              const val = f.value || '—';
              const valColor = val === 'yes' ? 'var(--green)' : val === 'no' ? 'var(--red)' : 'var(--ink)';
              const valText = val === 'yes' ? '✓ بله' : val === 'no' ? '✗ خیر' : escHtml(String(val));
              html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:.45rem 0;border-bottom:1px solid var(--line);font-size:.88rem">' +
                '<span style="font-weight:600;color:var(--ink)">'+escHtml(f.label)+'</span>' +
                '<span style="font-weight:700;color:'+valColor+'">'+valText+'</span>' +
              '</div>';
            });
          }
          html += '</div></div>';
        });
      }

      body.innerHTML = html;
    } catch(e) {
      body.innerHTML = '<div class="text-center text-danger py-4">خطا در دریافت اطلاعات.</div>';
    }
  }

  // ===== Load Filters =====
  async function loadFilters() {
    try {
      const res = await fetch(apiUrl('/filters'));
      const data = await res.json();
      data.provinces.forEach(p => { $('#f-province').insertAdjacentHTML('beforeend','<option>'+p+'</option>'); });
      data.types.forEach(t => { $('#f-type').insertAdjacentHTML('beforeend','<option>'+t+'</option>'); });
    } catch(e) { console.error('Filter load error:', e); }
  }

  // ===== Load Cities (province cascade) =====
  async function loadCities(province) {
    const citySel = $('#f-city');
    citySel.innerHTML = '<option value="">همه شهرها</option>';
    if (!province) return;
    citySel.disabled = true;
    citySel.innerHTML = '<option value="">در حال بارگذاری شهرها…</option>';
    try {
      const res = await fetch(apiUrl('/cities', { province }));
      const data = await res.json();
      citySel.innerHTML = '<option value="">همه شهرها (' + faNum(data.cities.length) + ' شهر)</option>';
      data.cities.forEach(c => { citySel.insertAdjacentHTML('beforeend','<option>'+c+'</option>'); });
    } catch(e) {
      citySel.innerHTML = '<option value="">خطا در دریافت شهرها</option>';
    } finally { citySel.disabled = false; }
  }

  // ===== Load Centers =====
  async function loadCenters(page) {
    currentPage = page;
    const q = $('#q').value.trim();
    const province = $('#f-province').value;
    const city = $('#f-city').value;
    const type = $('#f-type').value;
    const online = $('#f-online').value;
    const params = { page: String(page), limit: String(perPage) };
    if (q) params.search = q;
    if (province) params.province = province;
    if (city) params.city = city;
    if (type) params.type = type;
    if (online) params.isOnline = online;
    const rows = $('#rows');
    rows.innerHTML = '<tr><td colspan="8" class="spinner-overlay"><div class="spinner-border spinner-border-sm me-2"></div>در حال بارگذاری…</td></tr>';
    try {
      const res = await fetch(apiUrl('/centers', params));
      const data = await res.json();
      const pag = data.pagination || { total: data.total || 0, totalPages: data.totalPages || 1 };
      totalResults = pag.total;
      totalPagesCount = pag.totalPages;
      $('#rcount').textContent = faNum(totalResults);
      if (data.centers.length === 0) {
        rows.innerHTML = '';
        $('#empty').classList.remove('d-none');
        $('#pagination').innerHTML = '';
        return;
      }
      $('#empty').classList.add('d-none');
      rows.innerHTML = '';
      centerDataMap = {};
      data.centers.forEach(c => {
        centerDataMap[c.id] = c;
        const oi = c.isOnline ? '<i class="bi bi-check-circle-fill tick"></i>' : '<i class="bi bi-dash-circle cross"></i>';
        rows.insertAdjacentHTML('beforeend',
          '<tr><td data-label="نام مرکز">'+escHtml(c.center_name)+'</td>'+
          '<td data-label="نوع مرکز"><span class="badge-type">'+escHtml(c.type)+'</span></td>'+
          '<td data-label="تلفن"><span class="tel">'+escHtml(c.phone||'—')+'</span></td>'+
          '<td data-label="استان">'+escHtml(c.province)+'</td>'+
          '<td data-label="شهر">'+escHtml(c.city)+'</td>'+
          '<td data-label="آدرس" class="addr">'+escHtml(c.address||'—')+'</td>'+
          '<td data-label="آنلاین">'+oi+'</td>'+
          '<td data-label="عملیات"><button class="btn-select" data-id="'+c.id+'"><i class="bi bi-clipboard-check"></i>انتخاب</button></td></tr>');
      });
      renderPagination();
    } catch(e) {
      rows.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطا در دریافت اطلاعات.</td></tr>';
    }
  }

  // ===== Pagination =====
  function renderPagination() {
    const wrap = $('#pagination');
    if (totalPagesCount <= 1) { wrap.innerHTML = ''; return; }
    let html = '<button class="page-btn" data-page="'+(currentPage-1)+'" '+(currentPage<=1?'disabled':'')+'><i class="bi bi-chevron-right"></i></button>';
    const maxV = 5;
    let s = Math.max(1, currentPage-Math.floor(maxV/2)), e = Math.min(totalPagesCount, s+maxV-1);
    if (e-s < maxV-1) s = Math.max(1, e-maxV+1);
    if (s>1) { html+='<button class="page-btn" data-page="1">۱</button>'; if(s>2) html+='<span style="color:var(--muted);padding:0 4px;">…</span>'; }
    for(let i=s;i<=e;i++) html+='<button class="page-btn'+(i===currentPage?' active':'')+'" data-page="'+i+'">'+faNum(i)+'</button>';
    if (e<totalPagesCount) { if(e<totalPagesCount-1) html+='<span style="color:var(--muted);padding:0 4px;">…</span>'; html+='<button class="page-btn" data-page="'+totalPagesCount+'">'+faNum(totalPagesCount)+'</button>'; }
    html += '<button class="page-btn" data-page="'+(currentPage+1)+'" '+(currentPage>=totalPagesCount?'disabled':'')+'><i class="bi bi-chevron-left"></i></button>';
    wrap.innerHTML = html;
  }

  // ===== Bind Events =====
  function bindEvents() {
    $('#q').addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => loadCenters(1), 350); });
    const pEl = document.getElementById('f-province');
    if(pEl) pEl.addEventListener('change', async function() {
      const prov = this.value;
      await loadCities(prov);
      loadCenters(1);
    });
    ['f-city','f-type','f-online'].forEach(id => { const el=document.getElementById(id); if(el) el.addEventListener('change',()=>loadCenters(1)); });
    $('#clear-filters').addEventListener('click', e => {
      e.preventDefault();
      ['q','f-province','f-type','f-online'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
      $('#f-city').innerHTML = '<option value="">همه شهرها</option>';
      loadCenters(1);
    });
    $('#pagination').addEventListener('click', e => { const b=e.target.closest('.page-btn'); if(b&&!b.disabled){loadCenters(parseInt(b.dataset.page));document.querySelector('.table-scroll')?.scrollTo(0,0);} });
    $('#rows').addEventListener('click', e => { const b=e.target.closest('.btn-select'); if(b) openAudit(parseInt(b.dataset.id)); });
    $('#back-btn').addEventListener('click', e => { e.preventDefault(); backToSearch(); });
    $('#btn-cancel').addEventListener('click', () => { if(confirm('از انصراف مطمئن هستید؟')) backToSearch(); });
    $('#btn-next').addEventListener('click', () => { if(validateCurrentStep()) { completedSteps.add(currentStep); goToStep(currentStep+1); } });
    $('#btn-prev').addEventListener('click', () => goToStep(currentStep-1));
    $('#btn-submit').addEventListener('click', submitAudit);
    $('#btn-print').addEventListener('click', () => window.print());
    $('#modal-close').addEventListener('click', closeModal);
    $('#audit-modal').addEventListener('click', e => { if(e.target === $('#audit-modal')) closeModal(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
    document.addEventListener('input', onFieldChange);
    document.addEventListener('change', onFieldChange);
  }

  function closeModal() {
    const m = $('#audit-modal');
    m.classList.add('d-none');
    m.classList.remove('show');
  }

  // ===== Track Field Changes =====
  function onFieldChange(e) {
    const trackEl = e.target.closest('[data-track]');
    if (!trackEl) return;
    const key = trackEl.dataset.track;
    if (trackEl.dataset.datePicker) {
      if (e.target.classList.contains('dp-year') || e.target.classList.contains('dp-month')) {
        const y = parseInt(trackEl.querySelector('.dp-year').value);
        const m = parseInt(trackEl.querySelector('.dp-month').value);
        const daySel = trackEl.querySelector('.dp-day');
        const curDay = parseInt(daySel.value);
        const maxDay = jalaliMonthDays(y, m);
        let opts = '';
        for(let d=1;d<=maxDay;d++) opts+='<option value="'+d+'"'+(d===curDay?' selected':'')+'>'+faNum(d)+'</option>';
        daySel.innerHTML = opts;
      }
      fieldValues[key] = getShamsiDateValue(trackEl);
      updateProgress();
      return;
    }
    if (trackEl.classList.contains('yn-group')) {
      const checked = trackEl.querySelector('input:checked');
      fieldValues[key] = checked ? checked.value : '';
    } else {
      fieldValues[key] = trackEl.value;
    }
    if(trackEl.classList.contains('field-error')) trackEl.classList.remove('field-error');
    if(trackEl.style.outline) trackEl.style.outline = '';
    updateProgress();
  }

  // ===== Check if step is complete =====
  function isStepComplete(stepIdx) {
    if (!currentForm || !currentForm.rules[stepIdx]) return false;
    const rule = currentForm.rules[stepIdx];
    return (rule.fields || []).every((f, fi) => {
      const id = 'f_' + stepIdx + '_' + fi;
      const meta = typeMeta(f.type);
      if (meta.kind === 'upload') return (uploadedFiles[id] || 0) > 0;
      if (meta.kind === 'bool') return fieldValues[id] === 'yes' || fieldValues[id] === 'no';
      if (meta.kind === 'rate') return fieldValues[id] && parseInt(fieldValues[id]) > 0;
      return fieldValues[id] && String(fieldValues[id]).trim() !== '';
    });
  }

  // ===== Validate Current Step (REQUIRED before next) =====
  function validateCurrentStep() {
    if (!currentForm) return false;
    const rule = currentForm.rules[currentStep];
    if (!rule) return true;
    let allFilled = true;
    (rule.fields || []).forEach((f, fi) => {
      const id = 'f_' + currentStep + '_' + fi;
      const meta = typeMeta(f.type);
      let empty = false;
      if (meta.kind === 'upload') {
        const thBox = document.getElementById(id + '_th');
        if (!thBox || thBox.children.length === 0) empty = true;
      } else if (meta.kind === 'bool') {
        if (!fieldValues[id] || (fieldValues[id]!=='yes' && fieldValues[id]!=='no')) empty = true;
      } else if (meta.kind === 'rate') {
        if (!fieldValues[id] || parseInt(fieldValues[id])<=0) empty = true;
      } else {
        const el = document.getElementById(id);
        if (el && el.dataset.datePicker) { if(!fieldValues[id]) empty=true; }
        else if (!fieldValues[id] || String(fieldValues[id]).trim()==='') empty=true;
      }
      if (empty) {
        allFilled = false;
        const el = document.getElementById(id);
        if (el) {
          if(el.classList.contains('yn-group')) { el.style.outline='2px solid var(--red)'; el.style.outlineOffset='2px'; el.style.borderRadius='11px'; }
          else { el.classList.add('field-error'); }
        }
        if (meta.kind === 'upload') {
          const ub = document.getElementById(id+'_box');
          if(ub) ub.classList.add('field-error');
        }
      } else {
        const el = document.getElementById(id);
        if(el) { el.classList.remove('field-error'); el.style.outline=''; }
        if (meta.kind==='upload') { const ub=document.getElementById(id+'_box'); if(ub) ub.classList.remove('field-error'); }
      }
    });
    if (!allFilled) {
      showToast('err', 'لطفاً تمام فیلدهای این مرحله را تکمیل کنید.');
      const firstEmpty = document.querySelector('#step-content .field-error, #step-content [style*="outline: 2px solid var(--red)"]');
      if(firstEmpty) firstEmpty.scrollIntoView({behavior:'smooth',block:'center'});
      return false;
    }
    return true;
  }

  // ===== Open Audit Form =====
  async function openAudit(centerId) {
    const center = centerDataMap[centerId];
    if (!center) { showToast('err','مرکز یافت نشد'); return; }
    currentCenter = center;
    $('#a-name').textContent = center.center_name || '—';
    $('#a-type').textContent = center.type;
    $('#a-loc').textContent = center.province + ' \u00B7 ' + center.city;
    $('#a-tel').textContent = center.phone || '—';
    $('#a-date').textContent = getVisitDate();
    $('#stepper').innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm me-2"></div>در حال بارگذاری فرم نظارتی…</div>';
    $('#step-content').innerHTML = '';
    $('#a-form-badge').style.display = 'none';
    try {
      const formRes = await fetch(apiUrl('/audit-forms', { type: center.type }));
      const formData = await formRes.json();
      if (!formData.form) { showToast('err', formData.message || 'فرم نظارتی برای نوع «'+center.type+'» تعریف نشده.'); $('#stepper').innerHTML=''; return; }
      currentForm = formData.form;
      currentStep = 0;
      totalSteps = currentForm.rules.length;
      fieldValues = {};
      uploadedFiles = {};
      completedSteps = new Set();
      $('#a-form-title').textContent = currentForm.title;
      $('#a-form-steps').textContent = faNum(totalSteps) + ' گام';
      $('#a-form-badge').style.display = 'inline-flex';
      renderStepper();
      renderStepContent();
      updateStepUI();
      $('#page-search').classList.add('d-none');
      $('#page-audit').classList.remove('d-none');
      window.scrollTo(0,0);
    } catch(e) { console.error(e); showToast('err','خطا در بارگذاری فرم'); }
  }

  function backToSearch() {
    $('#page-audit').classList.add('d-none');
    $('#page-search').classList.remove('d-none');
    currentCenter=null; currentForm=null; fieldValues={}; uploadedFiles={}; completedSteps=new Set();
    loadStats();
    window.scrollTo(0,0);
  }

  // ===== Stepper =====
  function renderStepper() {
    const stepper = $('#stepper');
    let html = '';
    currentForm.rules.forEach((rule, i) => {
      const label = rule.rule.length > 30 ? rule.rule.substring(0,28)+'…' : rule.rule;
      html += '<div class="step-item" data-step="'+i+'"><div class="step-circle">'+faNum(i+1)+'</div><div class="step-label">'+escHtml(label)+'</div></div>';
    });
    stepper.innerHTML = html;
    stepper.querySelectorAll('.step-item').forEach(item => {
      item.addEventListener('click', () => {
        const ts = parseInt(item.dataset.step);
        if (ts < currentStep) { goToStep(ts); }
        else if (ts === currentStep+1) { if(validateCurrentStep()) { completedSteps.add(currentStep); goToStep(ts); } }
        else if (ts > currentStep+1) { if(validateCurrentStep()) { completedSteps.add(currentStep); goToStep(ts); } }
      });
    });
  }

  function updateStepperUI() {
    $$('#stepper .step-item').forEach((item, i) => {
      item.classList.remove('active','completed');
      const circle = item.querySelector('.step-circle');
      if(i < currentStep || completedSteps.has(i)) {
        item.classList.add('completed');
        circle.innerHTML = '<i class="bi bi-check2" style="font-size:1.1rem"></i>';
      } else if(i===currentStep) {
        item.classList.add('active');
        circle.innerHTML = faNum(i+1);
      } else {
        circle.innerHTML = faNum(i+1);
      }
    });
  }

  function goToStep(step) {
    if (step<0 || step>=totalSteps) return;
    saveCurrentStepValues();
    currentStep = step;
    renderStepContent();
    updateStepUI();
    window.scrollTo({top:(document.querySelector('.progress-wrap')?.offsetTop||200)-20,behavior:'smooth'});
  }

  // ===== Save Current Step Values =====
  function saveCurrentStepValues() {
    if (!currentForm) return;
    const rule = currentForm.rules[currentStep];
    if (!rule) return;
    (rule.fields||[]).forEach((f, fi) => {
      const id = 'f_'+currentStep+'_'+fi;
      const el = document.getElementById(id);
      if (el) {
        if (el.dataset.datePicker) fieldValues[id] = getShamsiDateValue(el);
        else if (el.classList.contains('yn-group')) { const c=el.querySelector('input:checked'); fieldValues[id]=c?c.value:''; }
        else fieldValues[id] = el.value;
      }
      const thBox = document.getElementById(id+'_th');
      if (thBox && thBox.children.length>0) uploadedFiles[id] = thBox.children.length;
    });
    if (isStepComplete(currentStep)) completedSteps.add(currentStep);
  }

  function updateStepUI() {
    updateStepperUI();
    $('#btn-prev').style.display = currentStep>0?'':'none';
    $('#btn-print').style.display = '';
    if(currentStep===totalSteps-1) { $('#btn-next').style.display='none'; $('#btn-submit').style.display=''; }
    else { $('#btn-next').style.display=''; $('#btn-submit').style.display='none'; }
    updateProgress();
  }

  // ===== Render Step Content =====
  function renderStepContent() {
    const container = $('#step-content');
    const rule = currentForm.rules[currentStep];
    if (!rule) return;
    let fieldsHtml = '';
    (rule.fields||[]).forEach((f, fi) => {
      const meta = typeMeta(f.type);
      const id = 'f_'+currentStep+'_'+fi;
      let ctrl = '';
      if (meta.kind==='bool') {
        const sv = fieldValues[id]||'';
        ctrl = '<div class="yn-group" id="'+id+'" data-track="'+id+'">'+
          '<input type="radio" name="'+id+'" value="yes" id="'+id+'_y"'+(sv==='yes'?' checked':'')+'>'+
          '<label for="'+id+'_y">بله</label>'+
          '<input type="radio" name="'+id+'" value="no" id="'+id+'_n"'+(sv==='no'?' checked':'')+'>'+
          '<label for="'+id+'_n" class="no-lbl">خیر</label></div>';
      } else if (meta.kind==='num') {
        ctrl = '<input type="number" class="form-control" id="'+id+'" data-track="'+id+'" style="max-width:220px" min="0" placeholder="عدد را وارد کنید" value="'+escHtml(fieldValues[id]||'')+'">';
      } else if (meta.kind==='upload') {
        ctrl = '<div class="upload-box" id="'+id+'_box" onclick="document.getElementById(\''+id+'_input\').click()">'+
          '<i class="bi bi-cloud-arrow-up"></i><div class="ut">بارگذاری فایل (تصویر / PDF)</div><div class="us">کلیک کنید یا فایل بکشید</div></div>'+
          '<input type="file" id="'+id+'_input" accept="image/*,.pdf" multiple style="display:none" data-track-upload="'+id+'">'+
          '<div class="thumbs" id="'+id+'_th" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem;"></div>';
      } else if (meta.kind==='select') {
        const sv = fieldValues[id]||'';
        const opts = parseOptions(f.instruction) || ['مورد اول','مورد دوم','سایر'];
        ctrl = '<select class="form-select" id="'+id+'" data-track="'+id+'" style="max-width:300px"><option value="">انتخاب کنید…</option>'+
          opts.map(o=>'<option'+(o===sv?' selected':'')+'>'+o+'</option>').join('')+'</select>';
      } else if (meta.kind==='date') {
        ctrl = createShamsiDatePicker(id, fieldValues[id]||'');
      } else if (meta.kind==='rate') {
        const sv = parseInt(fieldValues[id])||0;
        let stars = '';
        for(let s=1;s<=5;s++) stars+='<i class="bi bi-star-fill" data-rate="'+s+'" style="font-size:1.5rem;cursor:pointer;color:'+(s<=sv?'var(--gold)':'var(--line)')+';margin-left:.2rem;"></i>';
        ctrl = '<div id="'+id+'" data-track="'+id+'" style="display:flex;align-items:center;gap:.2rem;">'+stars+'<span class="ms-2" style="font-size:.85rem;color:var(--muted);" id="'+id+'_label">'+(sv?faNum(sv)+' از ۵':'')+'</span></div>';
      } else {
        ctrl = '<textarea class="form-control" id="'+id+'" data-track="'+id+'" rows="2" placeholder="پاسخ را وارد کنید">'+escHtml(fieldValues[id]||'')+'</textarea>';
      }
      fieldsHtml += '<div class="field-block"><div class="fl"><span>'+escHtml(f.label)+'</span><span class="ft-tag '+meta.cls+'">'+meta.lbl+'</span><span style="color:var(--red);font-weight:700;margin-right:.2rem;">*</span></div>'+ctrl+'<div class="hint"><i class="bi bi-info-circle me-1"></i>'+escHtml(f.instruction)+'</div></div>';
    });
    container.innerHTML = '<div class="step-wrapper active" data-step="'+currentStep+'"><div class="rule-card"><div class="rc-head"><div class="rc-num">'+faNum(currentStep+1)+'</div><div class="rc-rule">'+escHtml(rule.rule)+'</div></div><div class="rc-body">'+fieldsHtml+'</div></div></div>';

    // Bind upload events
    container.querySelectorAll('[data-track-upload]').forEach(input => {
      input.addEventListener('change',function(){onFiles(this);});
    });
    // Bind star rating events
    container.querySelectorAll('[data-rate]').forEach(star => {
      star.addEventListener('click', function() {
        const r=parseInt(this.dataset.rate);
        this.parentElement.querySelectorAll('[data-rate]').forEach((s,i)=>{s.style.color=(i<r)?'var(--gold)':'var(--line)';});
        fieldValues[this.parentElement.id]=String(r);
        const lbl=document.getElementById(this.parentElement.id+'_label');
        if(lbl) lbl.textContent=faNum(r)+' از ۵';
        updateProgress();
      });
    });
    // Drag and drop for upload boxes
    container.querySelectorAll('.upload-box').forEach(box => {
      box.addEventListener('dragover', e => { e.preventDefault(); box.style.borderColor='var(--navy-2)'; box.style.background='#E8F0FE'; });
      box.addEventListener('dragleave', e => { e.preventDefault(); box.style.borderColor=''; box.style.background=''; });
      box.addEventListener('drop', e => {
        e.preventDefault();
        box.style.borderColor=''; box.style.background='';
        const inputId = box.id.replace('_box','_input');
        const input = document.getElementById(inputId);
        if (input && e.dataTransfer.files.length) {
          input.files = e.dataTransfer.files;
          input.dispatchEvent(new Event('change'));
        }
      });
    });

    countTotalFields();
    updateProgress();
  }

  function countTotalFields() {
    totalFields = 0;
    currentForm.rules.forEach(r => { (r.fields||[]).forEach(()=>totalFields++); });
    $('#prog-total').textContent = faNum(totalFields);
  }

  // ===== File Upload (Enhanced) =====
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
  }

  function onFiles(input) {
    const trackId = input.dataset.trackUpload;
    const box = document.getElementById(trackId+'_th');
    [...input.files].slice(0,5).forEach(file => {
      const url = URL.createObjectURL(file);
      const d = document.createElement('div');
      d.className = 'thumb-item';
      const shortName = file.name.length > 12 ? file.name.substring(0,10)+'…' : file.name;
      if(file.type==='application/pdf') {
        d.innerHTML='<div style="width:100%;height:100%;background:#f8e8e8;display:flex;align-items:center;justify-content:center;flex-direction:column;"><i class="bi bi-file-earmark-pdf-fill" style="font-size:1.5rem;color:var(--red);"></i></div>' +
          '<span class="thumb-name">PDF · '+formatFileSize(file.size)+'</span>';
      } else {
        d.innerHTML='<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;">' +
          '<span class="thumb-name">'+escHtml(shortName)+'</span>';
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'thumb-remove';
      btn.textContent = '\u00D7';
      btn.addEventListener('click',()=>{d.remove();updateProgress();});
      d.appendChild(btn);
      box.appendChild(d);
    });
    const ub=document.getElementById(trackId+'_box');
    if(ub && box.children.length>0) ub.classList.remove('field-error');
    updateProgress();
  }

  // ===== Progress =====
  function updateProgress() {
    if(currentForm) saveCurrentStepValues();
    let done=0;
    if(currentForm) {
      currentForm.rules.forEach((rule,ri) => {
        (rule.fields||[]).forEach((f,fi) => {
          const id='f_'+ri+'_'+fi;
          const meta=typeMeta(f.type);
          if(meta.kind==='upload') {
            if(ri===currentStep){const tb=document.getElementById(id+'_th');if(tb&&tb.children.length>0)uploadedFiles[id]=tb.children.length;}
            if((uploadedFiles[id]||0)>0)done++;
          } else if(meta.kind==='bool') { if(fieldValues[id]==='yes'||fieldValues[id]==='no')done++; }
          else if(meta.kind==='rate') { if(fieldValues[id]&&parseInt(fieldValues[id])>0)done++; }
          else { if(fieldValues[id]&&String(fieldValues[id]).trim()!=='')done++; }
        });
      });
    }
    const pct=totalFields?Math.round(done/totalFields*100):0;
    $('#prog-done').textContent=faNum(done);
    $('#prog-pct').textContent=faNum(pct)+'\u066A';
    $('#prog-bar').style.width=pct+'%';
  }

  // ===== Submit =====
  async function submitAudit() {
    saveCurrentStepValues();
    let hasEmpty=false, firstEmpty=-1;
    currentForm.rules.forEach((rule,ri) => {
      (rule.fields||[]).forEach((f,fi) => {
        const id='f_'+ri+'_'+fi;
        const meta=typeMeta(f.type);
        let empty=false;
        if(meta.kind==='upload') { if((uploadedFiles[id]||0)===0)empty=true; }
        else if(meta.kind==='bool') { if(fieldValues[id]!=='yes'&&fieldValues[id]!=='no')empty=true; }
        else if(meta.kind==='rate') { if(!fieldValues[id]||parseInt(fieldValues[id])<=0)empty=true; }
        else { if(!fieldValues[id]||String(fieldValues[id]).trim()==='')empty=true; }
        if(empty&&firstEmpty===-1)firstEmpty=ri;
        if(empty)hasEmpty=true;
      });
    });
    if(hasEmpty) {
      goToStep(firstEmpty);
      showToast('err','همه فیلدها باید تکمیل شوند. به مرحله '+faNum(firstEmpty+1)+' هدایت شدید.');
      return;
    }
    const formData={
      formId:currentForm.id, formTitle:currentForm.title, visitDateShamsi:getVisitDate(),
      rules:currentForm.rules.map((rule,ri)=>({rule:rule.rule,fields:(rule.fields||[]).map((f,fi)=>{const id='f_'+ri+'_'+fi;return{label:f.label,type:f.type,value:fieldValues[id]||''};})}))
    };
    const assessorName=$('#a-assessor').value.trim()||'کارشناس نظارت';
    const btn=$('#btn-submit');
    btn.disabled=true; btn.innerHTML='<span class="spinner-border spinner-border-sm me-2"></span>در حال ثبت…';
    try {
      const res=await fetch(apiUrl('/audits'),{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content||''},
        body:JSON.stringify({centerId:currentCenter.id,assessorName,visitDate:getVisitDate(),formData:JSON.stringify(formData),status:'submitted'})});
      const data=await res.json();
      if(res.ok&&data.success){showToast('ok');setTimeout(()=>backToSearch(),1800);}
      else{showToast('err',data.error||'خطا');btn.disabled=false;btn.innerHTML='<i class="bi bi-check2-circle me-1"></i>ثبت اطلاعات';}
    } catch(e) { showToast('err','خطا در ارتباط با سرور');btn.disabled=false;btn.innerHTML='<i class="bi bi-check2-circle me-1"></i>ثبت اطلاعات'; }
  }

  // ===== Toast =====
  function showToast(type, msg) {
    const t=type==='ok'?$('#toast-ok'):$('#toast-err');
    if(type==='err'&&msg)$('#toast-err-msg').textContent=msg;
    t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);
  }

  // ===== Type Meta =====
  function typeMeta(t) {
    if(!t)return{cls:'ft-text',lbl:'متن',kind:'text'};
    if(t.includes('آپلود'))return{cls:'ft-upload',lbl:'آپلود',kind:'upload'};
    if(t.includes('چک‌باکس')||t.includes('بله/خیر'))return{cls:'ft-bool',lbl:'بله/خیر',kind:'bool'};
    if(t.includes('عدد'))return{cls:'ft-num',lbl:'عدد',kind:'num'};
    if(t.includes('انتخاب')||t.includes('کشویی'))return{cls:'ft-select',lbl:'انتخابی',kind:'select'};
    if(t.includes('تاریخ')||t.includes('زمان'))return{cls:'ft-date',lbl:'تاریخ شمسی',kind:'date'};
    if(t.includes('امتیاز'))return{cls:'ft-num',lbl:'امتیاز',kind:'rate'};
    if(t.includes('QR')||t.includes('بارکد'))return{cls:'ft-qr',lbl:'اسکن',kind:'qr'};
    return{cls:'ft-text',lbl:'متن',kind:'text'};
  }

  function parseOptions(instr) {
    if(!instr)return null;
    const m=instr.match(/:\s*([^\.\n]+)$/);
    if(m){const parts=m[1].split(/\s*[\/،]\s*/).map(x=>x.trim()).filter(x=>x.length>1&&x.length<28);if(parts.length>=2)return parts;}
    return null;
  }

})();