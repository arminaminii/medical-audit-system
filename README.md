# سامانه نظارت هوشمند مراکز درمانی — بازرسـک گروپ

پروژه **Laravel 11** با فرانت‌اند **Bootstrap 5 RTL** برای نظارت و ممیزی مراکز درمانی طرف قرارداد.

## پیش‌نیازها

- PHP 8.2+
- Composer
- MySQL / MariaDB / SQLite
- Node.js & NPM (اختیاری — فقط برای Bootstrap CDN)

## نصب و راه‌اندازی

```bash
# ۱. کلون ریپازیتوری
git clone https://github.com/arminaminii/medical-audit-system.git
cd medical-audit-system

# ۲. نصب وابستگی‌های PHP
composer install

# ۳. کپی و تنظیم فایل محیطی
cp .env.example .env
php artisan key:generate

# ۴. تنظیم دیتابیس در .env
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_DATABASE=medical_audit
# DB_USERNAME=root
# DB_PASSWORD=your_password

# ۵. ساخت جداول و وارد کردن داده‌ها
php artisan migrate --seed

# ۶. ساخت لینک استوریج (برای آپلود فایل‌ها)
php artisan storage:link

# ۷. اجرای سرور توسعه
php artisan serve
```

سپس مرورگر رو باز کنید: `http://localhost:8000`

## ساختار پروژه

```
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/     ← ۶ کنترلر API
│   │   └── Middleware/          ← CORS middleware
│   └── Models/                  ← Center, Audit
├── config/                      ← تنظیمات لاراول
├── database/
│   ├── migrations/              ← ۲ مایگریشن
│   └── seeders/                 ← ۳ سیدر (۱۲,۷۸۸ مرکز)
├── public/
│   ├── css/style.css            ← استایل سفارشی
│   └── js/app.js                ← منطق فرانت‌اند + تقویم شمسی
├── resources/
│   └── views/
│       └── audit.blade.php      ← صفحه اصلی
├── routes/
│   ├── api.php                  ← ۷ روت API
│   └── web.php                  ← روت اصلی
├── src/data/
│   ├── audit-forms.json         ← ساختار ۱۶ فرم ممیزی
│   └── centers-import.json      ← ۱۲,۷۸۸ مرکز درمانی
└── storage/                     ← فایل‌های آپلود و کش
```

## API Routes

| Method | URI | Controller | توضیح |
|--------|-----|-----------|-------|
| GET | `/api/stats` | StatsController | آمار کلی + آخرین ممیزی‌ها |
| GET | `/api/filters` | FilterController | لیست استان‌ها و انواع |
| GET | `/api/cities?province=X` | CityController | شهرهای یک استان |
| GET | `/api/centers?page=1&limit=25` | CenterController | لیست مراکز (فیلتر + جستجو) |
| GET | `/api/audit-forms?type=X` | AuditFormController | فرم ممیزی بر اساس نوع مرکز |
| GET | `/api/audits?auditId=X` | AuditController | جزئیات یک ممیزی |
| POST | `/api/audits` | AuditController@store | ثبت ممیزی جدید |

## نقشه نوع مراکز → فرم ممیزی

| نوع مرکز (دیتابیس) | عنوان فرم ممیزی |
|---------------------|-----------------|
| مطب، پزشک آنلاین | مطب پزشکان |
| دندانپزشکي | مطب دندان‌پزشکان |
| آزمايشگاه | آزمایشگاه‌ها |
| راديولوژي، سونوگرافي، CT Scan، MRI، ... | مراکز تصویربرداری |
| راديوتراپي | مراکز پرتودرمانی |
| فيزيوتراپي، اپتومتري، عينک سازي | فیزیوتراپی و توان‌بخشی |
| داروخانه | داروخانه‌ها |
| درمانگاه، کلينيک، موسسه | درمانگاه‌ها |
| مرکز جراحي محدود، آندوسکوپي | مراکز جراحی محدود |
| بيمارستان | بیمارستان |
| سنگ شکن | مراکز سنگ‌شکن |

## ویژگی‌ها

- ✅ جستجو و فیلتر آبشاری (استان → شهر → نوع)
- ✅ جدول صفحه‌بندی‌شده ۱۲,۷۸۸ مرکز درمانی
- ✅ ۱۶ فرم ممیزی اختصاصی با Stepper
- ✅ تقویم شمسی (جلالی) بدون وابستگی
- ✅ اعتبارسنجی اجباری هر مرحله
- ✅ آپلود تصویر و PDF
- ✅ ماندگاری مقادیر بین مراحل
- ✅ نوار پیشرفت
- ✅ تم Navy/Gold RTL با فونت وزیرمتن
- ✅ ریسپانسیو + پشتیبانی چاپ
- ✅ CSRF Token خودکار لاراول

## لایسنس

تمامی حقوق محفوظ است — بازرسـک گروپ