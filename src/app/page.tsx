'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/* ================================================================
   TYPE DEFINITIONS
   ================================================================ */
interface Center {
  id: number; name: string; centerCode: string; type: string;
  isOnline: boolean; displayName: string | null; province: string;
  city: string; phone: string | null; address: string;
  longitude: number | null; latitude: number | null;
}

interface FieldDef {
  label: string; type: string; instruction: string;
}

interface RuleDef {
  rule: string; fields: FieldDef[];
}

interface AuditCategory {
  id: string; title: string; rules: RuleDef[];
}

/* ================================================================
   CENTER TYPE → AUDIT FORM MAPPING
   Maps the 27 DB center types to 16 audit form categories
   ================================================================ */
const TYPE_MAP: Record<string, string> = {
  'مطب': '۸-۲-۱', 'پزشک آنلاين': '۸-۲-۱',
  'دندانپزشکي': '۸-۲-۲',
  'آزمايشگاه': '۸-۲-۳',
  'راديولوژي': '۸-۲-۴', 'سونوگرافي': '۸-۲-۴', 'CT Scan': '۸-۲-۴',
  'مرکز تصوير برداري': '۸-۲-۴', 'مرکز ام.آر.آي': '۸-۲-۴',
  'پزشکي هسته اي': '۸-۲-۴', 'ماموگرافي': '۸-۲-۴',
  'مرکز سنجش تراکم استخوان': '۸-۲-۴', 'آندوسکوپي': '۸-۲-۴',
  'اکوکارديوگرافي': '۸-۲-۴',
  'راديوتراپي': '۸-۲-۵',
  'فيزيوتراپي': '۸-۲-۶', 'نوار عصب و عضله': '۸-۲-۶',
  'داروخانه': '۸-۲-۷',
  'درمانگاه': '۸-۲-۸', 'کلينيک': '۸-۲-۸', 'مرکز چشم پزشکي': '۸-۲-۸', 'موسسه': '۸-۲-۸',
  'مرکز جراحي محدود': '۸-۲-۱۰',
  'بيمارستان': '۸-۲-۱۱',
  'سنگ شکن': '۸-۲-۱۲',
  'اپتومتري': '۸-۲-۶', 'عينک سازي': '۸-۲-۶',
}

/* Field type → tag class & label */
const FT_CLASS: Record<string, string> = {
  'ورود عدد': 'ft-num', 'چک‌باکس بله/خیر': 'ft-bool', 'آپلود تصویر': 'ft-upload',
  'منوی کشویی': 'ft-select', 'تاریخ/زمان': 'ft-date', 'متن کوتاه': 'ft-text',
  'آپلود فایل/تصویر': 'ft-upload',
}
const FT_LABEL: Record<string, string> = {
  'ورود عدد': 'عدد', 'چک‌باکس بله/خیر': 'بله/خیر', 'آپلود تصویر': 'تصویر',
  'منوی کشویی': 'انتخاب', 'تاریخ/زمان': 'تاریخ', 'متن کوتاه': 'متن',
  'آپلود فایل/تصویر': 'فایل/تصویر',
}

/* Dropdown options extracted from instructions */
function parseDropdownOptions(instruction: string): string[] {
  const m = instruction.match(/:\s*(.+?)\.\s*$/)
  if (m) return m[1].split('/').map(s => s.trim())
  return ['استاندارد', 'نیمه‌استاندارد', 'غیراستاندارد']
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function HomePage() {
  /* ---------- Search State ---------- */
  const [centers, setCenters] = useState<Center[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ q: '', province: '', city: '', type: '', online: '' })
  const [filterOptions, setFilterOptions] = useState<{ provinces: string[]; cities: string[]; types: string[] }>({ provinces: [], cities: [], types: [] })
  const limit = 25

  /* ---------- Audit State ---------- */
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null)
  const [auditCategory, setAuditCategory] = useState<AuditCategory | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  /* ---------- Refs ---------- */
  const formRef = useRef<HTMLDivElement>(null)

  /* ---------- Load Filters ---------- */
  useEffect(() => {
    fetch('/api/centers/filters').then(r => r.json()).then(d => setFilterOptions(d)).catch(() => {})
  }, [])

  /* ---------- Load Centers ---------- */
  const loadCenters = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.province) params.set('province', filters.province)
      if (filters.city) params.set('city', filters.city)
      if (filters.type) params.set('type', filters.type)
      if (filters.online) params.set('online', filters.online)
      params.set('page', String(page))
      params.set('limit', String(limit))
      const res = await fetch(`/api/centers?${params}`)
      const data = await res.json()
      setCenters(data.data || [])
      setTotal(data.total || 0)
    } catch { setCenters([]); setTotal(0) }
    setLoading(false)
  }, [filters, page])

  useEffect(() => { loadCenters() }, [loadCenters])

  /* Reset page on filter change */
  useEffect(() => { setPage(1) }, [filters])

  /* ---------- Filter Handlers ---------- */
  const updateFilter = (key: string, val: string) => setFilters(f => ({ ...f, [key]: val }))
  const clearFilters = () => setFilters({ q: '', province: '', city: '', type: '', online: '' })

  /* ---------- City filtering based on province ---------- */
  const filteredCities = filters.province
    ? filterOptions.cities.filter(c => {
        // rough: show all cities if province selected (DB has per-province cities)
        return true
      })
    : filterOptions.cities

  /* ================================================================
     SELECT CENTER → LOAD AUDIT FORM
     ================================================================ */
  const handleSelectCenter = async (center: Center) => {
    setSelectedCenter(center)
    setFormData({})
    setValidationErrors({})
    setCurrentStep(0)

    // Map center type to audit category
    const catId = TYPE_MAP[center.type] || '۸-۲-۸'
    try {
      const res = await fetch('/api/centers/filters')
      // Load audit forms from static JSON
      const auditForms: AuditCategory[] = await import('@/data/audit-forms.json').then(m => m.default)
      const cat = auditForms.find(c => c.id === catId)
      setAuditCategory(cat || auditForms[0])
    } catch { setAuditCategory(null) }
  }

  /* ---------- Back to Search ---------- */
  const handleBack = () => {
    setSelectedCenter(null)
    setAuditCategory(null)
    setCurrentStep(0)
    setFormData({})
    setValidationErrors({})
  }

  /* ================================================================
     STEPPER / TIMELINE LOGIC
     ================================================================ */
  const steps = auditCategory?.rules || []
  const totalSteps = steps.length
  const totalFields = steps.reduce((s, r) => s + r.fields.length, 0)
  const filledFields = Object.values(formData).filter(v => v && v.trim() !== '').length
  const progressPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0

  const goNext = () => { if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1) }
  const goPrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1) }
  const goToStep = (idx: number) => {
    if (idx >= 0 && idx < totalSteps) setCurrentStep(idx)
  }

  /* ---------- Form Data Handlers ---------- */
  const setField = (key: string, value: string) => {
    setFormData(f => ({ ...f, [key]: value }))
    if (value && value.trim()) {
      setValidationErrors(e => { const n = { ...e }; delete n[key]; return n })
    }
  }

  /* ================================================================
     CLIENT-SIDE VALIDATION
     ================================================================ */
  const validateAll = (): boolean => {
    if (!auditCategory) return false
    const errors: Record<string, boolean> = {}
    let allValid = true
    auditCategory.rules.forEach((rule, ri) => {
      rule.fields.forEach((field, fi) => {
        const key = `${ri}-${fi}`
        const val = formData[key]
        const isEmpty = !val || val.trim() === ''
        // All fields are required except uploads (simulated)
        if (isEmpty && field.type !== 'آپلود تصویر' && field.type !== 'آپلود فایل/تصویر') {
          errors[key] = true
          allValid = false
        }
      })
    })
    setValidationErrors(errors)
    return allValid
  }

  /* ================================================================
     FORM SUBMISSION
     ================================================================ */
  const handleSubmit = async () => {
    if (!validateAll()) {
      showToast('لطفاً تمام فیلدهای الزامی را تکمیل کنید', 'err')
      return
    }
    if (!selectedCenter) return

    setSubmitting(true)
    try {
      const now = new Date()
      const visitDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId: selectedCenter.id,
          visitDate,
          formData: JSON.stringify(formData),
          assessorName: 'کارشناس نظارت',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('گزارش ممیزی با موفقیت ثبت شد', 'ok')
        setTimeout(handleBack, 2000)
      } else {
        showToast(data.error || 'خطا در ثبت گزارش', 'err')
      }
    } catch {
      showToast('خطای شبکه. لطفاً دوباره تلاش کنید', 'err')
    }
    setSubmitting(false)
  }

  /* ---------- Toast ---------- */
  const showToast = (text: string, type: 'ok' | 'err') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  /* ================================================================
     RENDER: FIELD COMPONENT
     ================================================================ */
  const renderField = (field: FieldDef, stepIdx: number, fieldIdx: number) => {
    const key = `${stepIdx}-${fieldIdx}`
    const val = formData[key] || ''
    const hasError = validationErrors[key]
    const tagClass = FT_CLASS[field.type] || 'ft-text'
    const tagLabel = FT_LABEL[field.type] || field.type

    return (
      <div className="field-block" key={key}>
        <div className="fl">
          <span>{field.label}</span>
          <span className={`ft-tag ${tagClass}`}>{tagLabel}</span>
        </div>

        {/* Number Input */}
        {field.type === 'ورود عدد' && (
          <input type="number" className={`form-control ${hasError ? 'field-error' : ''}`}
            value={val} onChange={e => setField(key, e.target.value)} placeholder="مقدار عددی را وارد کنید" />
        )}

        {/* Yes/No Toggle */}
        {field.type === 'چک‌باکس بله/خیر' && (
          <div className="yn-group">
            <input type="radio" name={key} id={`${key}-y`} value="yes" checked={val === 'yes'} onChange={e => setField(key, e.target.value)} />
            <label htmlFor={`${key}-y`}>بله</label>
            <input type="radio" name={key} id={`${key}-n`} value="no" checked={val === 'no'} onChange={e => setField(key, e.target.value)} />
            <label htmlFor={`${key}-n`} className="no-lbl">خیر</label>
          </div>
        )}

        {/* Dropdown Select */}
        {field.type === 'منوی کشویی' && (
          <select className={`form-select ${hasError ? 'field-error' : ''}`} value={val} onChange={e => setField(key, e.target.value)}>
            <option value="">انتخاب کنید...</option>
            {parseDropdownOptions(field.instruction).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}

        {/* DateTime */}
        {field.type === 'تاریخ/زمان' && (
          <input type="datetime-local" className={`form-control ${hasError ? 'field-error' : ''}`}
            value={val} onChange={e => setField(key, e.target.value)} />
        )}

        {/* Text Input */}
        {field.type === 'متن کوتاه' && (
          <input type="text" className={`form-control ${hasError ? 'field-error' : ''}`}
            value={val} onChange={e => setField(key, e.target.value)} placeholder="توضیحات..." />
        )}

        {/* Upload (simulated - notes field) */}
        {(field.type === 'آپلود تصویر' || field.type === 'آپلود فایل/تصویر') && (
          <div className="upload-box" onClick={() => {
            const note = prompt(`بارگذاری تصویر: ${field.label}\n(در محیط نمونه، توضیحات را وارد کنید):`)
            if (note) setField(key, `[تصویر بارگذاری‌شده: ${note}]`)
          }}>
            <i className="bi bi-cloud-arrow-up"></i>
            <div className="ut">{val ? '✓ فایل بارگذاری شد' : 'کلیک کنید برای بارگذاری'}</div>
            <div className="us">{val ? val : 'JPG, PNG — حداکثر ۵ مگابایت'}</div>
          </div>
        )}

        <div className="hint"><i className="bi bi-info-circle me-1"></i>{field.instruction}</div>
        {hasError && <div className="error-msg show"><i className="bi bi-exclamation-triangle me-1"></i>تکمیل این فیلد الزامی است</div>}
      </div>
    )
  }

  /* ================================================================
     RENDER: PAGINATION
     ================================================================ */
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const renderPagination = () => {
    if (totalPages <= 1) return null
    const pages: (number | string)[] = []
    const maxVisible = 7
    let start = Math.max(1, page - 3)
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)

    if (start > 1) { pages.push(1); if (start > 2) pages.push('...') }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages) }

    return (
      <div className="pagination-wrapper">
        <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          <i className="bi bi-chevron-right"></i>
        </button>
        {pages.map((p, i) =>
          typeof p === 'string' ? <span key={`d${i}`} className="px-1 text-muted">...</span> : (
            <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
          )
        )}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
          <i className="bi bi-chevron-left"></i>
        </button>
      </div>
    )
  }

  /* ================================================================
     RENDER: SEARCH DASHBOARD
     ================================================================ */
  const renderSearch = () => (
    <>
      {/* Header */}
      <header className="topbar">
        <div className="container py-2">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-clipboard2-pulse" style={{ fontSize: '1.8rem' }}></i>
              <div>
                <div className="brand-name">بازرسـک گروپ</div>
                <div className="brand-sub">سامانه یکپارچه نظارت هوشمند مراکز درمانی</div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <span className="phone d-none d-sm-inline"><i className="bi bi-telephone-fill me-1"></i>۰۲۱-۹۶۹۹۰</span>
              <span className="pill-badge">پنل ارزیاب</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container pb-4">
        {/* Page Head */}
        <div className="page-head d-flex gap-3 align-items-start">
          <div className="seal"><i className="bi bi-clipboard2-pulse"></i></div>
          <div>
            <h1>مراکز درمانی طرف قرارداد</h1>
            <p>کارشناس گرامی، مرکز موردنظر را جست‌وجو و انتخاب کنید تا فرم ممیزی اختصاصی آن باز شود.
               پیش از ثبت گزارش، <span className="accent">احراز هویت و تطبیق مدارک مرکز</span> الزامی است.</p>
          </div>
        </div>
        <hr className="divider-grad mb-4" />

        {/* Filters */}
        <div className="filter-card mb-4">
          <div className="search-hero mb-3">
            <i className="bi bi-search si"></i>
            <input type="text" className="form-control" placeholder="جست‌وجو بر اساس نام پزشک یا مرکز…"
              value={filters.q} onChange={e => updateFilter('q', e.target.value)} />
          </div>
          <div className="row g-3">
            <div className="col-md-3 col-6">
              <label className="form-label-sm">استان</label>
              <select className="form-select" value={filters.province} onChange={e => updateFilter('province', e.target.value)}>
                <option value="">همه استان‌ها</option>
                {filterOptions.provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label-sm">شهر</label>
              <select className="form-select" value={filters.city} onChange={e => updateFilter('city', e.target.value)}>
                <option value="">همه شهرها</option>
                {filteredCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label-sm">نوع مرکز</label>
              <select className="form-select" value={filters.type} onChange={e => updateFilter('type', e.target.value)}>
                <option value="">همه انواع</option>
                {filterOptions.types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label-sm">معرفی‌نامه آنلاین</label>
              <select className="form-select" value={filters.online} onChange={e => updateFilter('online', e.target.value)}>
                <option value="">فرقی ندارد</option>
                <option value="true">دارد</option>
                <option value="false">ندارد</option>
              </select>
            </div>
            <div className="col-12 d-flex justify-content-end">
              <a href="#" className="btn-clear" onClick={e => { e.preventDefault(); clearFilters() }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>پاک‌کردن فیلترها
              </a>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <span className="result-count"><i className="bi bi-geo-alt-fill"></i><span className="n">{total.toLocaleString('fa-IR')}</span> مرکز یافت شد</span>
          <span className="text-muted small"><i className="bi bi-info-circle me-1"></i>برای شروع ممیزی روی «انتخاب» بزنید</span>
        </div>

        {/* Table */}
        <div className="table-scroll">
          {loading ? (
            <div className="spinner-overlay"><div className="spinner-border" role="status"></div></div>
          ) : centers.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-inbox" style={{ fontSize: '2.4rem', opacity: .4 }}></i>
              <div className="mt-2">موردی با این فیلترها پیدا نشد. فیلترها را تغییر دهید.</div>
            </div>
          ) : (
            <table className="ctable">
              <thead>
                <tr>
                  <th>نام پزشک / مرکز</th>
                  <th>نوع مرکز</th>
                  <th>تلفن</th>
                  <th>استان</th>
                  <th>شهر</th>
                  <th>آدرس</th>
                  <th>آنلاین</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {centers.map(c => (
                  <tr key={c.id}>
                    <td data-label="نام مرکز">{c.displayName || c.name}</td>
                    <td data-label="نوع"><span className="badge-type">{c.type}</span></td>
                    <td data-label="تلفن">{c.phone ? <span className="tel">{c.phone}</span> : '—'}</td>
                    <td data-label="استان">{c.province}</td>
                    <td data-label="شهر">{c.city}</td>
                    <td data-label="آدرس"><div className="addr">{c.address}</div></td>
                    <td data-label="آنلاین">{c.isOnline ? <i className="bi bi-check-circle-fill tick"></i> : <i className="bi bi-dash-circle cross"></i>}</td>
                    <td data-label="عملیات">
                      <button className="btn-select" onClick={() => handleSelectCenter(c)}>
                        انتخاب <i className="bi bi-arrow-left"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {renderPagination()}
      </main>
      <footer className="app-foot">سامانه نظارت هوشمند <b>بازرسـک گروپ</b> — مدیریت عمر، درمان و حوادث · نسخه نمونه</footer>
    </>
  )

  /* ================================================================
     RENDER: AUDIT FORM WITH STEPPER/TIMELINE
     ================================================================ */
  const renderAudit = () => {
    if (!selectedCenter || !auditCategory) return null
    const now = new Date()
    const today = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`

    return (
      <>
        {/* Header */}
        <header className="topbar">
          <div className="container py-2">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <i className="bi bi-clipboard2-pulse" style={{ fontSize: '1.8rem' }}></i>
                <div>
                  <div className="brand-name">بازرسـک گروپ</div>
                  <div className="brand-sub">سامانه یکپارچه نظارت هوشمند مراکز درمانی</div>
                </div>
              </div>
              <span className="pill-badge">فرم ممیزی</span>
            </div>
          </div>
        </header>

        <main className="container py-3" ref={formRef}>
          <a href="#" className="back-link mb-3 d-inline-block" onClick={e => { e.preventDefault(); handleBack() }}>
            <i className="bi bi-arrow-right me-1"></i>بازگشت به فهرست مراکز
          </a>

          {/* Center Info */}
          <div className="audit-head mb-3">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <div className="ctitle">{selectedCenter.displayName || selectedCenter.name}</div>
                <div className="cmeta">
                  <span><i className="bi bi-hospital"></i>{selectedCenter.type}</span>
                  <span className="mx-2">·</span>
                  <span><i className="bi bi-geo-alt"></i>{selectedCenter.province}، {selectedCenter.city}</span>
                  <span className="mx-2">·</span>
                  <span><i className="bi bi-telephone"></i><span className="tel">{selectedCenter.phone || '—'}</span></span>
                </div>
              </div>
              <div className="text-start">
                <div className="cmeta"><i className="bi bi-calendar-event"></i> تاریخ بازدید: <span dir="ltr">{today}</span></div>
                <div className="cmeta"><i className="bi bi-person-badge"></i> ارزیاب: کارشناس نظارت</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-wrap mb-4">
            <div className="d-flex justify-content-between mb-1">
              <span className="lbl">پیشرفت تکمیل فرم</span>
              <span className="lbl">
                <span>{filledFields}</span> از <span>{totalFields}</span> فیلد · <span>{progressPct}٪</span>
              </span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>

          {/* ===== STEPPER TIMELINE ===== */}
          <div className="stepper-timeline mb-4">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep
              const isActive = idx === currentStep
              return (
                <div
                  key={idx}
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => goToStep(idx)}
                >
                  <div className="step-circle">
                    {isCompleted ? <i className="bi bi-check-lg"></i> : (idx + 1)}
                  </div>
                  <div className="step-label">{step.rule.substring(0, 30)}{step.rule.length > 30 ? '…' : ''}</div>
                </div>
              )
            })}
          </div>

          {/* ===== STEP WRAPPERS ===== */}
          <div>
            {steps.map((step, stepIdx) => (
              <div key={stepIdx} className={`step-wrapper ${stepIdx === currentStep ? 'active' : ''}`} data-step={stepIdx}>
                <div className="rule-card">
                  <div className="rc-head">
                    <div className="rc-num">{stepIdx + 1}</div>
                    <div className="rc-rule">{step.rule}</div>
                  </div>
                  <div className="rc-body">
                    {step.fields.map((field, fieldIdx) => renderField(field, stepIdx, fieldIdx))}
                  </div>
                </div>

                {/* Step Navigation Buttons */}
                <div className="d-flex justify-content-between mt-3 mb-2 px-1">
                  <div>
                    {stepIdx > 0 && (
                      <button className="btn-step btn-prev" onClick={goPrev}>
                        <i className="bi bi-arrow-right me-1"></i>قبلی
                      </button>
                    )}
                  </div>
                  <div>
                    {/* Final step: NO "Next" button — only Submit/Cancel in action-bar */}
                    {stepIdx < totalSteps - 1 && (
                      <button className="btn-step btn-next" onClick={goNext}>
                        بعدی<i className="bi bi-arrow-left ms-1"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ===== STICKY ACTION BAR ===== */}
          <div className="action-bar">
            <div className="container d-flex justify-content-end gap-2">
              <button className="btn-cancel-audit" onClick={handleBack} disabled={submitting}>
                <i className="bi bi-x-lg me-1"></i>انصراف
              </button>
              <button className="btn-submit-audit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>در حال ثبت…</>
                ) : (
                  <><i className="bi bi-check2-circle me-1"></i>ثبت اطلاعات</>
                )}
              </button>
            </div>
          </div>
        </main>
        <footer className="app-foot">سامانه نظارت هوشمند <b>بازرسـک گروپ</b></footer>
      </>
    )
  }

  /* ================================================================
     RENDER: TOAST NOTIFICATIONS
     ================================================================ */
  const renderToast = () => {
    if (!toastMsg) return null
    const cls = toastMsg.type === 'ok' ? 'toast-ok' : 'toast-err'
    const icon = toastMsg.type === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'
    return (
      <div className={`${cls} show`}>
        <i className={`bi ${icon}`}></i>
        <span>{toastMsg.text}</span>
      </div>
    )
  }

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div className="min-h-screen flex flex-col">
      {selectedCenter && auditCategory ? renderAudit() : renderSearch()}
      {renderToast()}
    </div>
  )
}