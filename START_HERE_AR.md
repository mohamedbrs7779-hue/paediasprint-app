# PaediaSprint — GitHub + Cloudflare (بدون نسخ كود يدوي)

## قبل كل شيء
هذه الحزمة تحتوي ملفات **المشروع الفعلي** لتطبيق Cloudflare Workers، وليست نسخة HTML للمعاينة. الأسئلة المنشورة مبدئياً هي المجموعة المستقلة (90 سؤالاً)، وتوجد مسودات إضافية غير منشورة. لا تتضمن أرشيف PDF الخاص ولا كلمات مرور أو مفاتيح دفع.

**الحزمة لم تُنشر على حسابك ولم يُختبر الدفع الحقيقي.** تبقى `SALES_ENABLED=false` و`EDITORIAL_APPROVED=false` و`CONTENT_RIGHTS_CONFIRMED=false`. راجع الرخصة، وحقوق المحتوى، والمادة الطبية، والتكامل التجاري قبل فتح البيع.

## 1. إنشاء مستودع GitHub
1. افتح https://github.com/new وسجّل الدخول.
2. اكتب الاسم `paediasprint-app`.
3. اختر **Private**.
4. اترك خيارات README و.gitignore والترخيص غير محددة ثم اضغط Create repository.
5. فك الضغط عن `PaediaSprint_GitHub_Ready.zip` على جهازك.
6. داخل مستودع GitHub افتح **uploading an existing file** أو `Add file > Upload files`.
7. **ارفع الملفات والمجلدات الموجودة داخل المجلد المستخرج**، ولا ترفع ملف ZIP ذاته؛ GitHub لن يفك ZIP تلقائياً.
8. تأكد أن الصفحة الرئيسية للمستودع تحتوي `wrangler.toml` و`package.json` و`src/` و`public/` و`migrations/` مباشرة (دون مجلد أب إضافي).
9. اضغط Commit changes.

على التابلت قد يكون رفع مجلدات متشعبة من المتصفح أصعب من الكمبيوتر. إذا واجهتك مشكلة في اختيار المجلدات، استخدم متصفح الكمبيوتر أو افتح GitHub في وضع **Desktop site**. لا ترفع الملفات الناقصة ثم تتوقع نجاح البناء.

## 2. Cloudflare Worker متصل بـ GitHub
1. افتح Cloudflare → Workers & Pages → Create application → Connect GitHub.
2. وافق على صلاحية Cloudflare للوصول **فقط** إلى مستودع `paediasprint-app` إن أمكن.
3. اختر الفرع `main` والمجلد الجذر `./`.
4. **Worker name** يجب أن يكون `paediasprint` تماماً حتى يطابق `wrangler.toml`.
5. Build command: `npm test` (اختياري؛ يوقف النشر عند فشل الاختبارات).
6. Deploy command: `npx wrangler deploy`.
7. احفظ ثم راقب Build logs. إذا نجح النشر، اختبر `https://paediasprint.<YOUR-SUBDOMAIN>.workers.dev/api/health`.

## 3. قاعدة D1
قاعدة البيانات `paediasprint-db` موجودة بالفعل، ومعرفها مضبوط في `wrangler.toml`.
لكن **الجداول لا تُنشأ تلقائياً بمجرد ربط GitHub**. بعد نجاح نشر الخادم نفّذ بالترتيب: `migrations/0001_init.sql` ثم `migrations/0002_source_review.sql` ثم `migrations/0003_payhip_one_time.sql` عبر D1 Console أو `wrangler d1 migrations apply DB --remote` باستخدام صلاحية مناسبة. ثم شغّل `data/seed.sql` لإضافة المجموعة الأساسية، و`data/uk_teaching_seed.sql` لإضافة المسودات إذا لزم. لا تضع بيانات الـPDF الخاص داخل مستودع GitHub.

## 4. إعداد تسجيل الدخول والدفع
من Cloudflare → Worker → Settings → Variables & Secrets، عرّف المتغيرات السرية بمعزل عن GitHub:
- `SESSION_SECRET` (عشوائي قوي)
- `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `PUBLIC_BASE_URL`
- `PAYHIP_API_KEY` (سري للغاية، لا تشاركه في محادثة أو صورة)
- `SUPPORT_EMAIL`, `BUSINESS_LEGAL_NAME`, `BUSINESS_ADDRESS` (صحيحة قانونياً)

التطبيق مضبوط على رابط دفع Payhip لمدة **30 يوماً فقط**: `https://payhip.com/order?link=dFfHl&pricing_plan=63WdAKYmzw`. السعر `PAYHIP_30D_PRICE_CENTS=2150` مثال افتراضي ويجب مطابقته مع السعر الفعلي في Payhip قبل اختبار إشعارات الدفع.

بعد إعداد webhook في Payhip على `https://YOUR-SITE/api/webhook/payhip` واختبار التوقيع والمبلغ والبريد والصلاحية والاسترداد، وبعد تصاريح النشاط والحقوق والمراجعة الطبية، يمكن تقييم فتح المبيعات. **لا تغير خيارات المبيعات حالياً**.

## متطلبات تقنية
`package.json` يستخدم Node.js 22 و Wrangler 4. بنية المشروع في جذر المستودع. الاتصال بـGitHub يقوم بالنشر المتكرر؛ لكنه لا ينشئ بشكل تلقائي جداول D1 أو يربط حساب البريد أو يتحقق من Payhip.
