(function(){
  'use strict';

  // ===== State =====
  let currentPage = 1;
  let totalResults = 0;
  let totalPagesCount = 0;
  const perPage = 25;
  let currentCenter = null;
  let currentForm = null;
  let currentStep = 0;
  let totalSteps = 0;
  let totalFields = 0;
  let debounceTimer = null;
  // Store field values across all steps so progress is accurate
  let fieldValues = {}; // key: 'f_{step}_{fieldIdx}', value: string or true
  let uploadCounts = {}; // key: 'f_{step}_{fieldIdx}', value: number of uploaded files

  // ===== Utilities =====
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const faNum = s => String(s).replace(/\d/g, d => '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'[d]);

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', async () => {
    await loadFilters();
    await loadCenters(1);
    bindEvents();
  });

  // ===== Load Filters =====
  async function loadFilters() {
    try {
      const res = await fetch('/api/filters');
      const data = await res.json();
      const pSel = $('#f-province');
      data.provinces.forEach(p => {
        pSel.insertAdjacentHTML('beforeend', '<option>' + p + '</option>');
      });
      const tSel = $('#f-type');
      data.types.forEach(t => {
        tSel.insertAdjacentHTML('beforeend', '<option>' + t + '</option>');
      });
    } catch(e) {
      console.error('Filter load error:', e);
    }
  }

  // ===== Load Cities (dependent on province) =====
  async function loadCities(province) {
    const citySel = $('#f-city');
    citySel.innerHTML = '<option value="">همه شهرها</option>';
    if (!province) return;

    // Show loading state
    citySel.disabled = true;
    citySel.innerHTML = '<option value="">در حال بارگذاری شهرها…</option>';

    try {
      const res = await fetch('/api/cities?province=' + encodeURIComponent(province));
      const data = await res.json();
      citySel.innerHTML = '<option value="">همه شهرها (' + faNum(data.cities.length) + ' شهر)</option>';
      data.cities.forEach(c => {
        citySel.insertAdjacentHTML('beforeend', '<option>' + c + '</option>');
      });
    } catch(e) {
      console.error('City load error:', e);
      citySel.innerHTML = '<option value="">خطا در دریافت شهرها</option>';
    } finally {
      citySel.disabled = false;
    }
  }

  // ===== Load Centers (AJAX with pagination) =====
  async function loadCenters(page) {
    currentPage = page;
    const q = $('#q').value.trim();
    const province = $('#f-province').value;
    const city = $('#f-city').value;
    const type = $('#f-type').value;
    const online = $('#f-online').value;

    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (q) params.set('q', q);
    if (province) params.set('province', province);
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    if (online) params.set('online', online);

    const rows = $('#rows');
    rows.innerHTML = '<tr><td colspan="8" class="spinner-overlay"><div class="spinner-border spinner-border-sm me-2"></div>در حال بارگذاری…</td></tr>';

    try {
      const res = await fetch('/api/centers?' + params.toString());
      const data = await res.json();
      totalResults = data.total;
      totalPagesCount = data.totalPages;

      $('#rcount').textContent = faNum(totalResults);

      if (data.centers.length === 0) {
        rows.innerHTML = '';
        $('#empty').classList.remove('d-none');
        $('#pagination').innerHTML = '';
        return;
      }

      $('#empty').classList.add('d-none');
      rows.innerHTML = '';

      data.centers.forEach(c => {
        const onlineIcon = c.isOnline
          ? '<i class="bi bi-check-circle-fill tick"></i>'
          : '<i class="bi bi-dash-circle cross"></i>';
        const phone = c.phone || '—';
        const addr = c.address || '—';

        rows.insertAdjacentHTML('beforeend',
          '<tr>' +
            '<td data-label="نام مرکز">' + escHtml(c.name) + '</td>' +
            '<td data-label="نوع مرکز"><span class="badge-type">' + escHtml(c.type) + '</span></td>' +
            '<td data-label="تلفن"><span class="tel">' + escHtml(phone) + '</span></td>' +
            '<td data-label="استان">' + escHtml(c.province) + '</td>' +
            '<td data-label="شهر">' + escHtml(c.city) + '</td>' +
            '<td data-label="آدرس" class="addr">' + escHtml(addr) + '</td>' +
            '<td data-label="آنلاین">' + onlineIcon + '</td>' +
            '<td data-label="عملیات"><button class="btn-select" data-id="' + c.id + '"><i class="bi bi-clipboard-check"></i>انتخاب</button></td>' +
          '</tr>'
        );
      });

      renderPagination();
    } catch(e) {
      console.error('Centers load error:', e);
      rows.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطا در دریافت اطلاعات. دوباره تلاش کنید.</td></tr>';
    }
  }

  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Pagination =====
  function renderPagination() {
    const wrap = $('#pagination');
    if (totalPagesCount <= 1) { wrap.innerHTML = ''; return; }

    let html = '';
    html += '<button class="page-btn" data-page="' + (currentPage - 1) + '" ' + (currentPage <= 1 ? 'disabled' : '') + '><i class="bi bi-chevron-right"></i></button>';

    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPagesCount, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      html += '<button class="page-btn" data-page="1">۱</button>';
      if (start > 2) html += '<span style="color:var(--muted);padding:0 4px;">…</span>';
    }
    for (let i = start; i <= end; i++) {
      html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + faNum(i) + '</button>';
    }
    if (end < totalPagesCount) {
      if (end < totalPagesCount - 1) html += '<span style="color:var(--muted);padding:0 4px;">…</span>';
      html += '<button class="page-btn" data-page="' + totalPagesCount + '">' + faNum(totalPagesCount) + '</button>';
    }

    html += '<button class="page-btn" data-page="' + (currentPage + 1) + '" ' + (currentPage >= totalPagesCount ? 'disabled' : '') + '><i class="bi bi-chevron-left"></i></button>';

    wrap.innerHTML = html;
  }

  // ===== Bind Events =====
  function bindEvents() {
    $('#q').addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadCenters(1), 350);
    });

    // Province change: load cities FIRST, then load centers
    const provinceEl = document.getElementById('f-province');
    if (provinceEl) {
      provinceEl.addEventListener('change', async () => {
        const province = provinceEl.value;
        await loadCities(province);
        loadCenters(1);
      });
    }

    // Other filters: just reload centers
    ['f-city', 'f-type', 'f-online'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => loadCenters(1));
      }
    });

    $('#clear-filters').addEventListener('click', e => {
      e.preventDefault();
      ['q', 'f-province', 'f-city', 'f-type', 'f-online'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      $('#f-city').innerHTML = '<option value="">همه شهرها</option>';
      loadCenters(1);
    });

    $('#pagination').addEventListener('click', e => {
      const btn = e.target.closest('.page-btn');
      if (btn && !btn.disabled) {
        loadCenters(parseInt(btn.dataset.page));
        document.querySelector('.table-scroll')?.scrollTo(0, 0);
      }
    });

    $('#rows').addEventListener('click', e => {
      const btn = e.target.closest('.btn-select');
      if (btn) openAudit(parseInt(btn.dataset.id));
    });

    $('#back-btn').addEventListener('click', e => { e.preventDefault(); backToSearch(); });
    $('#btn-cancel').addEventListener('click', () => {
      if (confirm('از انصراف مطمئن هستید؟ اطلاعات وارد‌شده ذخیره نمی‌شود.')) backToSearch();
    });

    $('#btn-next').addEventListener('click', () => goToStep(currentStep + 1));
    $('#btn-prev').addEventListener('click', () => goToStep(currentStep - 1));
    $('#btn-submit').addEventListener('click', submitAudit);
    // Use delegation for progress tracking
    document.addEventListener('input', onFieldChange);
    document.addEventListener('change', onFieldChange);
  }

  // ===== Save field values on change/input =====
  function onFieldChange(e) {
    const trackEl = e.target.closest('[data-track]');
    if (!trackEl) return;
    const key = trackEl.dataset.track;
    if (trackEl.classList.contains('yn-group')) {
      const checked = trackEl.querySelector('input:checked');
      fieldValues[key] = checked ? checked.value : '';
    } else {
      fieldValues[key] = trackEl.value;
    }
    updateProgress();
  }

  // ===== Open Audit Form =====
  async function openAudit(centerId) {
    try {
      const res = await fetch('/api/centers/' + centerId);
      const data = await res.json();
      if (!data.center) { showToast('err', 'مرکز یافت نشد'); return; }
      currentCenter = data.center;

      $('#a-name').textContent = currentCenter.name || currentCenter.displayName || '—';
      $('#a-type').textContent = currentCenter.type;
      $('#a-loc').textContent = currentCenter.province + ' \u00B7 ' + currentCenter.city;
      $('#a-tel').textContent = currentCenter.phone || '—';
      $('#a-date').textContent = faNum(new Date().toLocaleDateString('fa-IR'));

      // Show loading in stepper area
      $('#stepper').innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm me-2"></div>در حال بارگذاری فرم نظارتی…</div>';
      $('#step-content').innerHTML = '';

      const formRes = await fetch('/api/audit-forms?type=' + encodeURIComponent(currentCenter.type));
      const formData = await formRes.json();

      if (!formData.form) {
        showToast('err', 'فرم نظارتی برای نوع «' + currentCenter.type + '» تعریف نشده است.');
        $('#stepper').innerHTML = '';
        return;
      }

      currentForm = formData.form;
      currentStep = 0;
      totalSteps = currentForm.rules.length;

      // Reset stored values
      fieldValues = {};
      uploadCounts = {};

      // Show form category title
      $('#a-form-title').textContent = currentForm.title;
      $('#a-form-steps').textContent = faNum(totalSteps) + ' گام';
      $('#a-form-badge').style.display = 'inline-flex';

      renderStepper();
      renderStepContent();
      updateStepUI();

      $('#page-search').classList.add('d-none');
      $('#page-audit').classList.remove('d-none');
      window.scrollTo(0, 0);
    } catch(e) {
      console.error('Open audit error:', e);
      showToast('err', 'خطا در بارگذاری فرم نظارتی');
    }
  }

  function backToSearch() {
    $('#page-audit').classList.add('d-none');
    $('#page-search').classList.remove('d-none');
    currentCenter = null;
    currentForm = null;
    fieldValues = {};
    uploadCounts = {};
    window.scrollTo(0, 0);
  }

  // ===== Stepper Timeline =====
  function renderStepper() {
    const stepper = $('#stepper');
    let html = '';
    currentForm.rules.forEach((rule, i) => {
      const label = rule.rule.length > 30 ? rule.rule.substring(0, 28) + '…' : rule.rule;
      html += '<div class="step-item" data-step="' + i + '">' +
        '<div class="step-circle">' + faNum(i + 1) + '</div>' +
        '<div class="step-label">' + escHtml(label) + '</div>' +
      '</div>';
    });
    stepper.innerHTML = html;

    stepper.querySelectorAll('.step-item').forEach(item => {
      item.addEventListener('click', () => {
        goToStep(parseInt(item.dataset.step));
      });
    });
  }

  function goToStep(step) {
    if (step < 0 || step >= totalSteps) return;
    // Save current step values before navigating
    saveCurrentStepValues();
    currentStep = step;
    renderStepContent();
    updateStepUI();
    window.scrollTo({ top: (document.querySelector('.progress-wrap')?.offsetTop || 200) - 20, behavior: 'smooth' });
  }

  // ===== Save values from current visible step =====
  function saveCurrentStepValues() {
    if (!currentForm) return;
    const rule = currentForm.rules[currentStep];
    if (!rule) return;
    (rule.fields || []).forEach((f, fi) => {
      const id = 'f_' + currentStep + '_' + fi;
      const el = document.getElementById(id);
      if (el) {
        if (el.classList.contains('yn-group')) {
          const checked = el.querySelector('input:checked');
          fieldValues[id] = checked ? checked.value : '';
        } else {
          fieldValues[id] = el.value;
        }
      }
      // Count uploads
      const thBox = document.getElementById(id + '_th');
      if (thBox) {
        uploadCounts[id] = thBox.children.length;
      }
    });
  }

  function updateStepUI() {
    $$('#stepper .step-item').forEach((item, i) => {
      item.classList.remove('active', 'completed');
      if (i < currentStep) item.classList.add('completed');
      else if (i === currentStep) item.classList.add('active');
    });

    $('#btn-prev').style.display = currentStep > 0 ? '' : 'none';
    if (currentStep === totalSteps - 1) {
      $('#btn-next').style.display = 'none';
      $('#btn-submit').style.display = '';
    } else {
      $('#btn-next').style.display = '';
      $('#btn-submit').style.display = 'none';
    }

    updateProgress();
  }

  // ===== Render Step Content =====
  function renderStepContent() {
    const container = $('#step-content');
    const rule = currentForm.rules[currentStep];
    if (!rule) return;

    let fieldsHtml = '';
    (rule.fields || []).forEach((f, fi) => {
      const meta = typeMeta(f.type);
      const id = 'f_' + currentStep + '_' + fi;
      let ctrl = '';

      if (meta.kind === 'bool') {
        const savedVal = fieldValues[id] || '';
        ctrl = '<div class="yn-group" id="' + id + '" data-track="' + id + '">' +
          '<input type="radio" name="' + id + '" value="yes" id="' + id + '_y"' + (savedVal === 'yes' ? ' checked' : '') + '>' +
          '<label for="' + id + '_y">بله</label>' +
          '<input type="radio" name="' + id + '" value="no" id="' + id + '_n"' + (savedVal === 'no' ? ' checked' : '') + '>' +
          '<label for="' + id + '_n" class="no-lbl">خیر</label>' +
        '</div>';
      } else if (meta.kind === 'num') {
        const savedVal = fieldValues[id] || '';
        ctrl = '<input type="number" class="form-control" id="' + id + '" data-track="' + id + '" style="max-width:220px" min="0" placeholder="عدد را وارد کنید" value="' + escHtml(savedVal) + '">';
      } else if (meta.kind === 'upload') {
        ctrl = '<div class="upload-box" onclick="document.getElementById(\'' + id + '_input\').click()">' +
          '<i class="bi bi-cloud-arrow-up"></i>' +
          '<div class="ut">بارگذاری تصویر</div>' +
          '<div class="us">حداکثر ۴ تصویر</div>' +
        '</div>' +
        '<input type="file" id="' + id + '_input" accept="image/*" multiple style="display:none" data-track-upload="' + id + '">' +
        '<div class="thumbs" id="' + id + '_th" style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.6rem;"></div>';
      } else if (meta.kind === 'select') {
        const savedVal = fieldValues[id] || '';
        const opts = parseOptions(f.instruction) || ['مورد اول', 'مورد دوم', 'سایر'];
        ctrl = '<select class="form-select" id="' + id + '" data-track="' + id + '" style="max-width:300px">' +
          '<option value="">انتخاب کنید…</option>' +
          opts.map(o => '<option' + (o === savedVal ? ' selected' : '') + '>' + o + '</option>').join('') +
        '</select>';
      } else if (meta.kind === 'date') {
        const savedVal = fieldValues[id] || '';
        ctrl = '<input type="datetime-local" class="form-control" id="' + id + '" data-track="' + id + '" style="max-width:240px" value="' + escHtml(savedVal) + '">';
      } else {
        const savedVal = fieldValues[id] || '';
        ctrl = '<input type="text" class="form-control" id="' + id + '" data-track="' + id + '" placeholder="پاسخ را وارد کنید" value="' + escHtml(savedVal) + '">';
      }

      fieldsHtml += '<div class="field-block">' +
        '<div class="fl"><span>' + escHtml(f.label) + '</span><span class="ft-tag ' + meta.cls + '">' + meta.lbl + '</span></div>' +
        ctrl +
        '<div class="hint"><i class="bi bi-info-circle me-1"></i>' + escHtml(f.instruction) + '</div>' +
      '</div>';
    });

    container.innerHTML = '<div class="step-wrapper active" data-step="' + currentStep + '">' +
      '<div class="rule-card">' +
        '<div class="rc-head">' +
          '<div class="rc-num">' + faNum(currentStep + 1) + '</div>' +
          '<div class="rc-rule">' + escHtml(rule.rule) + '</div>' +
        '</div>' +
        '<div class="rc-body">' + fieldsHtml + '</div>' +
      '</div>' +
    '</div>';

    // Bind upload handlers
    container.querySelectorAll('[data-track-upload]').forEach(input => {
      input.addEventListener('change', function() { onFiles(this); });
    });

    countTotalFields();
    updateProgress();
  }

  function countTotalFields() {
    totalFields = 0;
    currentForm.rules.forEach(rule => {
      (rule.fields || []).forEach(() => totalFields++);
    });
    $('#prog-total').textContent = faNum(totalFields);
  }

  // ===== File Upload Preview =====
  function onFiles(input) {
    const trackId = input.dataset.trackUpload;
    const box = document.getElementById(trackId + '_th');
    [...input.files].slice(0, 4).forEach(file => {
      const url = URL.createObjectURL(file);
      const d = document.createElement('div');
      d.style.cssText = 'position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--line);box-shadow:var(--shadow-sm);';
      d.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover">' +
        '<button type="button" style="position:absolute;top:2px;left:2px;background:rgba(192,57,43,.92);color:#fff;border:0;border-radius:6px;width:18px;height:18px;font-size:.7rem;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer">\u00D7</button>';
      d.querySelector('button').addEventListener('click', () => { d.remove(); updateProgress(); });
      box.appendChild(d);
    });
    updateProgress();
  }

  // ===== Progress (counts across ALL steps, not just visible) =====
  function updateProgress() {
    // Save current step values first
    if (currentForm) saveCurrentStepValues();

    let done = 0;
    // Count from stored values across all steps
    if (currentForm) {
      currentForm.rules.forEach((rule, ri) => {
        (rule.fields || []).forEach((f, fi) => {
          const id = 'f_' + ri + '_' + fi;
          const meta = typeMeta(f.type);
          if (meta.kind === 'upload') {
            // For uploads, check current step's thumbs or saved count
            if (ri === currentStep) {
              const thBox = document.getElementById(id + '_th');
              if (thBox && thBox.children.length > 0) {
                uploadCounts[id] = thBox.children.length;
              }
            }
            if ((uploadCounts[id] || 0) > 0) done++;
          } else if (meta.kind === 'bool') {
            if (fieldValues[id] === 'yes' || fieldValues[id] === 'no') done++;
          } else {
            if (fieldValues[id] && fieldValues[id].trim() !== '') done++;
          }
        });
      });
    }

    const pct = totalFields ? Math.round(done / totalFields * 100) : 0;
    $('#prog-done').textContent = faNum(done);
    $('#prog-pct').textContent = faNum(pct) + '\u066A';
    $('#prog-bar').style.width = pct + '%';
  }

  // ===== Submit Audit =====
  async function submitAudit() {
    // Save current step values
    saveCurrentStepValues();

    // Validate all steps from stored values
    let hasEmpty = false;
    let firstEmptyStep = -1;

    currentForm.rules.forEach((rule, ri) => {
      (rule.fields || []).forEach((f, fi) => {
        const id = 'f_' + ri + '_' + fi;
        const meta = typeMeta(f.type);
        let isEmpty = false;

        if (meta.kind === 'upload') {
          if ((uploadCounts[id] || 0) === 0) isEmpty = true;
        } else if (meta.kind === 'bool') {
          if (fieldValues[id] !== 'yes' && fieldValues[id] !== 'no') isEmpty = true;
        } else {
          if (!fieldValues[id] || fieldValues[id].trim() === '') isEmpty = true;
        }

        if (isEmpty && firstEmptyStep === -1) firstEmptyStep = ri;
        if (isEmpty) hasEmpty = true;
      });
    });

    if (hasEmpty) {
      // Navigate to first empty step
      if (firstEmptyStep !== -1 && firstEmptyStep !== currentStep) {
        goToStep(firstEmptyStep);
      }
      // Highlight empty fields in current step
      $$('#step-content [data-track]').forEach(el => {
        if (el.classList.contains('yn-group')) {
          if (!el.querySelector('input:checked')) {
            el.style.outline = '2px solid var(--red)';
          } else {
            el.style.outline = '';
          }
        } else {
          if (!el.value || el.value.trim() === '') {
            el.classList.add('field-error');
          } else {
            el.classList.remove('field-error');
          }
        }
      });

      $$('#step-content [data-track-upload]').forEach(el => {
        const thId = el.dataset.trackUpload + '_th';
        const thBox = document.getElementById(thId);
        if (thBox && thBox.children.length === 0) {
          el.previousElementSibling?.classList.add('field-error');
        }
      });

      showToast('err', 'لطفاً تمام فیلدهای فرم را تکمیل کنید. به گام ' + faNum(firstEmptyStep + 1) + ' هدایت شدید.');
      return;
    }

    // Collect form data from stored values
    const formData = {
      formId: currentForm.id,
      formTitle: currentForm.title,
      rules: currentForm.rules.map((rule, ri) => ({
        rule: rule.rule,
        fields: (rule.fields || []).map((f, fi) => {
          const id = 'f_' + ri + '_' + fi;
          return { label: f.label, type: f.type, value: fieldValues[id] || '' };
        })
      }))
    };

    const assessorName = $('#a-assessor').value.trim() || 'کارشناس نظارت';
    const visitDate = new Date().toISOString().split('T')[0];

    const btn = $('#btn-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>در حال ثبت…';

    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId: currentCenter.id,
          assessorName,
          visitDate,
          formData: JSON.stringify(formData),
          status: 'submitted',
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast('ok');
        setTimeout(() => backToSearch(), 1800);
      } else {
        showToast('err', data.error || 'خطا در ثبت گزارش');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>ثبت اطلاعات';
      }
    } catch(e) {
      console.error('Submit error:', e);
      showToast('err', 'خطا در ارتباط با سرور');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>ثبت اطلاعات';
    }
  }

  // ===== Toast =====
  function showToast(type, msg) {
    const toast = type === 'ok' ? $('#toast-ok') : $('#toast-err');
    if (type === 'err' && msg) {
      $('#toast-err-msg').textContent = msg;
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // ===== Field Type Mapping =====
  function typeMeta(t) {
    if (!t) return { cls: 'ft-text', lbl: 'متن', kind: 'text' };
    if (t.includes('آپلود')) return { cls: 'ft-upload', lbl: 'آپلود', kind: 'upload' };
    if (t.includes('چک‌باکس')) return { cls: 'ft-bool', lbl: 'بله/خیر', kind: 'bool' };
    if (t.includes('عدد')) return { cls: 'ft-num', lbl: 'عدد', kind: 'num' };
    if (t.includes('کشویی')) return { cls: 'ft-select', lbl: 'انتخابی', kind: 'select' };
    if (t.includes('تاریخ')) return { cls: 'ft-date', lbl: 'تاریخ/زمان', kind: 'date' };
    if (t.includes('امتیاز')) return { cls: 'ft-rate', lbl: 'امتیاز', kind: 'rate' };
    if (t.includes('QR') || t.includes('بارکد')) return { cls: 'ft-qr', lbl: 'اسکن', kind: 'qr' };
    return { cls: 'ft-text', lbl: 'متن', kind: 'text' };
  }

  function parseOptions(instr) {
    if (!instr) return null;
    const m = instr.match(/:\s*([^\.\n]+)$/);
    if (m) {
      const parts = m[1].split(/\s*[\/،]\s*/).map(x => x.trim()).filter(x => x.length > 1 && x.length < 28);
      if (parts.length >= 2) return parts;
    }
    return null;
  }

})();
