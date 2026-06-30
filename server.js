const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Prisma
const db = new PrismaClient();

// ============================================
// HTML Page (Laravel Blade-style)
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// API: Filters (provinces + types)
// ============================================
app.get('/api/filters', async (req, res) => {
  try {
    const [provinces, types] = await Promise.all([
      db.medicalCenter.findMany({
        distinct: ['province'],
        where: { province: { not: '' } },
        orderBy: { province: 'asc' },
        select: { province: true },
      }),
      db.medicalCenter.findMany({
        distinct: ['type'],
        orderBy: { type: 'asc' },
        select: { type: true },
      }),
    ]);
    res.json({
      provinces: provinces.map(p => p.province),
      types: types.map(t => t.type),
    });
  } catch (e) {
    console.error('/api/filters error:', e);
    res.status(500).json({ error: 'خطا در دریافت فیلترها' });
  }
});

// ============================================
// API: Cities by Province
// ============================================
app.get('/api/cities', async (req, res) => {
  try {
    const { province } = req.query;
    if (!province) return res.json({ cities: [] });
    const cities = await db.medicalCenter.findMany({
      distinct: ['city'],
      where: { province: String(province) },
      orderBy: { city: 'asc' },
      select: { city: true },
    });
    res.json({ cities: cities.map(c => c.city) });
  } catch (e) {
    console.error('/api/cities error:', e);
    res.status(500).json({ error: 'خطا در دریافت شهرها' });
  }
});

// ============================================
// API: Centers (filtered + paginated)
// ============================================
app.get('/api/centers', async (req, res) => {
  try {
    const { q, province, city, type, online, page = '1', perPage = '25' } = req.query;
    const p = Math.max(1, parseInt(page));
    const pp = Math.min(100, Math.max(1, parseInt(perPage)));
    const where = {};

    if (q && q.trim()) {
      where.OR = [
        { name: { contains: String(q) } },
        { displayName: { contains: String(q) } },
        { address: { contains: String(q) } },
        { centerCode: { contains: String(q) } },
      ];
    }
    if (province) where.province = String(province);
    if (city) where.city = String(city);
    if (type) where.type = String(type);
    if (online === '1') where.isOnline = true;
    else if (online === '0') where.isOnline = false;

    const [centers, total] = await Promise.all([
      db.medicalCenter.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (p - 1) * pp,
        take: pp,
        select: {
          id: true, name: true, centerCode: true, type: true,
          isOnline: true, province: true, city: true, phone: true, address: true,
        },
      }),
      db.medicalCenter.count({ where }),
    ]);

    res.json({
      centers,
      total,
      page: p,
      perPage: pp,
      totalPages: Math.ceil(total / pp),
    });
  } catch (e) {
    console.error('/api/centers error:', e);
    res.status(500).json({ error: 'خطا در دریافت مراکز' });
  }
});

// ============================================
// API: Single Center
// ============================================
app.get('/api/centers/:id', async (req, res) => {
  try {
    const center = await db.medicalCenter.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!center) return res.status(404).json({ error: 'مرکز یافت نشد' });
    res.json({ center });
  } catch (e) {
    console.error('/api/centers/:id error:', e);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات مرکز' });
  }
});

// ============================================
// API: Audit Forms by Center Type
// ============================================
const TYPE_MAP = {
  'مطب': 'مطب پزشکان',
  'دندانپزشکي': 'مطب دندان‌پزشکان',
  'آزمايشگاه': 'آزمایشگاه‌ها',
  'راديولوژي': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'سونوگرافي': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'CT Scan': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'مرکز تصوير برداري': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'مرکز ام.آر.آي': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'پزشکي هسته اي': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'ماموگرافي': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'سنگ شکن': 'مراکز سنگ‌شکن',
  'راديوتراپي': 'مراکز پرتودرمانی',
  'فيزيوتراپي': 'فیزیوتراپی، توان‌بخشی، گفتاردرمانی، بینایی‌سنجی، کاردرمانی و شنوایی‌سنجی',
  'بيمارستان': 'بیمارستان',
  'داروخانه': 'داروخانه‌ها',
  'درمانگاه': 'درمانگاه‌ها و مراکز جامع سلامت',
  'کلينيک': 'درمانگاه‌ها و مراکز جامع سلامت',
  'مرکز جراحي محدود': 'مراکز جراحی محدود',
  'اکوکارديوگرافي': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'آندوسکوپي': 'مراکز جراحی محدود',
  'مرکز سنجش تراکم استخوان': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'مرکز چشم پزشکي': 'مراکز جراحی محدود',
  'عينک سازي': 'فیزیوتراپی، توان‌بخشی، گفتاردرمانی، بینایی‌سنجی، کاردرمانی و شنوایی‌سنجی',
  'اپتومتري': 'فیزیوتراپی، توان‌بخشی، گفتاردرمانی، بینایی‌سنجی، کاردرمانی و شنوایی‌سنجی',
  'نوار عصب و عضله': 'مراکز تصویربرداری (رادیولوژی، سونوگرافی، سی‌تی‌اسکن، پزشکی هسته‌ای، MRI)',
  'پزشک آنلاين': 'مطب پزشکان',
  'موسسه': 'درمانگاه‌ها و مراکز جامع سلامت',
};

let auditFormsCache = null;
function getAuditForms() {
  if (!auditFormsCache) {
    auditFormsCache = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/audit-forms.json'), 'utf-8'));
  }
  return auditFormsCache;
}

app.get('/api/audit-forms', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) return res.status(400).json({ error: 'نوع مرکز الزامی است' });

    const categoryTitle = TYPE_MAP[String(type)] || null;
    if (!categoryTitle) return res.json({ error: 'فرم نظارتی برای این نوع مرکز تعریف نشده', form: null });

    const forms = getAuditForms();
    const form = forms.find(f => f.title === categoryTitle);
    if (!form) return res.json({ error: 'فرم نظارتی یافت نشد', form: null });

    res.json({ form });
  } catch (e) {
    console.error('/api/audit-forms error:', e);
    res.status(500).json({ error: 'خطا در دریافت فرم نظارتی' });
  }
});

// ============================================
// API: Submit Audit
// ============================================
app.post('/api/audits', async (req, res) => {
  try {
    const { centerId, assessorName, visitDate, formData, status } = req.body;

    if (!centerId || !visitDate || !formData) {
      return res.status(400).json({ error: 'فیلدهای الزامی: شناسه مرکز، تاریخ بازدید، داده‌های فرم' });
    }

    const center = await db.medicalCenter.findUnique({ where: { id: parseInt(centerId) } });
    if (!center) return res.status(404).json({ error: 'مرکز مورد نظر یافت نشد' });

    const audit = await db.audit.create({
      data: {
        centerId: parseInt(centerId),
        assessorName: assessorName || 'کارشناس نظارت',
        visitDate: String(visitDate),
        formData: typeof formData === 'string' ? formData : JSON.stringify(formData),
        status: status || 'submitted',
      },
      include: { center: { select: { name: true, type: true } } },
    });

    res.json({
      success: true,
      message: 'گزارش ممیزی با موفقیت ثبت شد',
      audit: { id: audit.id, centerName: audit.center.name },
    });
  } catch (e) {
    console.error('/api/audits error:', e);
    res.status(500).json({ error: 'خطا در ثبت گزارش ممیزی' });
  }
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});