import Script from "next/script";

export default function Home() {
  return (
    <>
      {/* ============ هدر مشترک ============ */}
      <header className="topbar">
        <div className="container py-2">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-3">
              <div style={{width:42,height:42,borderRadius:10,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem'}}>
                <i className="bi bi-clipboard2-pulse"></i>
              </div>
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

      {/* ============ صفحه ۱: داشبورد جستجو ============ */}
      <main id="page-search">
        <div className="container">
          <div className="page-head d-flex gap-3 align-items-start">
            <div className="seal"><i className="bi bi-clipboard2-pulse"></i></div>
            <div>
              <h1>مراکز درمانی طرف قرارداد</h1>
              <p>کارشناس گرامی، مرکز موردنظر را جست‌وجو و انتخاب کنید تا فرم ممیزی اختصاصی آن باز شود.
                 پیش از ثبت گزارش، <span className="accent">احراز هویت و تطبیق مدارک مرکز</span> الزامی است.</p>
            </div>
          </div>
          <hr className="divider-grad mb-4" />

          {/* فیلترها */}
          <div className="filter-card mb-4">
            <div className="search-hero mb-3">
              <i className="bi bi-search si"></i>
              <input type="text" className="form-control" id="q" placeholder="جست‌وجو بر اساس نام پزشک یا مرکز…" />
            </div>
            <div className="row g-3">
              <div className="col-md-3 col-6">
                <label className="form-label-sm">استان</label>
                <select className="form-select" id="f-province"><option value="">همه استان‌ها</option></select>
              </div>
              <div className="col-md-3 col-6">
                <label className="form-label-sm">شهر</label>
                <select className="form-select" id="f-city"><option value="">همه شهرها</option></select>
              </div>
              <div className="col-md-3 col-6">
                <label className="form-label-sm">نوع مرکز</label>
                <select className="form-select" id="f-type"><option value="">همه انواع</option></select>
              </div>
              <div className="col-md-3 col-6">
                <label className="form-label-sm">معرفی‌نامه آنلاین</label>
                <select className="form-select" id="f-online">
                  <option value="">فرقی ندارد</option>
                  <option value="1">دارد</option>
                  <option value="0">ندارد</option>
                </select>
              </div>
              <div className="col-md-3 col-6 d-flex align-items-end justify-content-between">
                <a href="#" className="btn-clear" id="clear-filters"><i className="bi bi-arrow-counterclockwise me-1"></i>پاک‌کردن فیلترها</a>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <span className="result-count"><i className="bi bi-geo-alt-fill"></i><span className="n" id="rcount">۰</span> مرکز یافت شد</span>
            <span className="text-muted" style={{fontSize:'.82rem'}}><i className="bi bi-info-circle me-1"></i>برای شروع ممیزی روی «انتخاب» بزنید</span>
          </div>

          {/* جدول نتایج */}
          <div className="table-scroll">
            <table className="ctable">
              <thead>
                <tr>
                  <th>نام مرکز</th>
                  <th>نوع مرکز</th>
                  <th>تلفن</th>
                  <th>استان</th>
                  <th>شهر</th>
                  <th>آدرس</th>
                  <th>آنلاین</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody id="rows">
                <tr><td colSpan={8} className="spinner-overlay"><div className="spinner-border spinner-border-sm me-2"></div>در حال بارگذاری…</td></tr>
              </tbody>
            </table>
            <div id="empty" className="text-center text-muted py-5 d-none">
              <i className="bi bi-inbox" style={{fontSize:'2.4rem',opacity:'.4'}}></i>
              <div className="mt-2">موردی با این فیلترها پیدا نشد. فیلترها را تغییر دهید.</div>
            </div>
          </div>

          {/* صفحه‌بندی */}
          <div className="pagination-wrapper" id="pagination"></div>
        </div>
        <footer className="app-foot">سامانه نظارت هوشمند <b>بازرسـک گروپ</b> — مدیریت عمر، درمان و حوادث</footer>
      </main>

      {/* ============ صفحه ۲: فرم ممیزی ============ */}
      <main id="page-audit" className="d-none">
        <div className="container py-3">
          <a href="#" className="back-link mb-3 d-inline-block" id="back-btn"><i className="bi bi-arrow-right me-1"></i>بازگشت به فهرست مراکز</a>

          <div className="audit-head mb-3">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <div className="ctitle" id="a-name">—</div>
                <div className="cmeta">
                  <span><i className="bi bi-hospital"></i><span id="a-type">—</span></span>
                  <span className="mx-2">·</span>
                  <span><i className="bi bi-geo-alt"></i><span id="a-loc">—</span></span>
                  <span className="mx-2">·</span>
                  <span><i className="bi bi-telephone"></i><span className="tel" id="a-tel">—</span></span>
                </div>
              </div>
              <div style={{textAlign:'left'}}>
                <div className="form-category-badge" id="a-form-badge" style={{display:'none',marginBottom:'.5rem'}}>
                  <i className="bi bi-journal-check me-1"></i>
                  <span id="a-form-title">—</span>
                  <span className="mx-1" style={{opacity:'.5'}}>|</span>
                  <span id="a-form-steps">—</span>
                </div>
                <div className="cmeta"><i className="bi bi-calendar-event"></i> تاریخ بازدید: <span id="a-date"></span></div>
                <div className="cmeta"><i className="bi bi-person-badge"></i> ارزیاب: <input type="text" id="a-assessor" defaultValue="کارشناس نظارت" style={{background:'transparent',border:'none',color:'#D7E0F0',fontSize:'.85rem',width:'140px',padding:0,outline:'none',textAlign:'left',direction:'ltr'}} /></div>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="progress-wrap mb-3">
            <div className="stepper-timeline" id="stepper"></div>
          </div>

          <div className="progress-wrap mb-4">
            <div className="d-flex justify-content-between mb-1">
              <span className="lbl">پیشرفت تکمیل فرم</span>
              <span className="lbl"><span id="prog-done">۰</span> از <span id="prog-total">۰</span> فیلد · <span id="prog-pct">۰٪</span></span>
            </div>
            <div className="progress"><div className="progress-bar" id="prog-bar" style={{width:'0%'}}></div></div>
          </div>

          <div id="step-content"></div>

          <div className="action-bar">
            <div className="container d-flex justify-content-between align-items-center">
              <div>
                <button type="button" className="btn-step btn-prev" id="btn-prev" style={{display:'none'}}><i className="bi bi-arrow-right me-1"></i>مرحله قبل</button>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn-cancel-audit" id="btn-cancel"><i className="bi bi-x-lg me-1"></i>انصراف</button>
                <button type="button" className="btn-step btn-next" id="btn-next" style={{display:'none'}}>مرحله بعد<i className="bi bi-arrow-left ms-1"></i></button>
                <button type="button" className="btn-submit-audit" id="btn-submit" style={{display:'none'}}><i className="bi bi-check2-circle me-1"></i>ثبت اطلاعات</button>
              </div>
            </div>
          </div>
        </div>
        <footer className="app-foot">سامانه نظارت هوشمند <b>بازرسـک گروپ</b></footer>
      </main>

      {/* Toast */}
      <div className="toast-ok" id="toast-ok"><i className="bi bi-check-circle-fill"></i><span>گزارش ممیزی با موفقیت ثبت شد.</span></div>
      <div className="toast-err" id="toast-err"><i className="bi bi-exclamation-triangle-fill"></i><span id="toast-err-msg">خطا در ثبت</span></div>

      {/* Load vanilla JS via next/script */}
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}