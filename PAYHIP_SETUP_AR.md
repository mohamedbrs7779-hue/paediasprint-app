# ربط Payhip بـ PaediaSprint — 23 نوفمبر 2026

## ماذا أنجزنا في هذه الحزمة
- زر شراء باقة **30 يومًا، دفع مرة واحدة** يوجّه إلى رابطك: `https://payhip.com/order?link=dFfHl&pricing_plan=63WdAKYmzw`.
- تسجيل الطلاب والتحقق من البريد يبقيان داخل PaediaSprint؛ لا تُنقل الأسئلة إلى Payhip.
- رابط استقبال Payhip webhook على الموقع: `https://YOUR-SITE/api/webhook/payhip`.
- حدث `paid` الموثّق يسجل دفعة ويمنح وصولًا لمدة 30 يومًا لصاحب الحساب الموثّق إذا تطابق بريده في الموقع مع البريد المستخدم للشراء. حدث `refunded` الكامل يلغي وصول الدفعة.
- يمنع النظام تلقائيًا منح صلاحية عند اختلاف المنتج أو المبلغ أو العملة أو التوقيع، ويمنع معالجة نفس الطلب مرتين.
- لا توجد اشتراكات متجددة؛ خطة 365 يومًا غير مفعّلة حتى تجهيز رابط وسعر مستقلين.
- **لم ننشر الموقع ولم نفعّل الدفع الحقيقي. لا تفتح البيع قبل الاختبار والتراخيص وحقوق الأسئلة.**

## الخطوات على Cloudflare
1. افتح ملفات الإصدار المحدّث، لا ترفع ملف ZIP كما هو إلى متجر Payhip.
2. إذا كان الموقع منشورًا فعلاً من نسخة سابقة، احتفظ بنسخة احتياطية من قاعدة D1 ولا تنشئ قاعدة جديدة.
3. أضف ترحيل قاعدة البيانات `migrations/0003_payhip_one_time.sql` باستخدام `npm run db:remote` (بعد ضبط `database_id` الصحيح).
4. تأكد من هذه القيم داخل `wrangler.toml`:
   - `PAYMENT_PROVIDER = "payhip"`
   - `PAYHIP_CHECKOUT_30D_URL = "https://payhip.com/order?link=dFfHl&pricing_plan=63WdAKYmzw"`
   - `PAYHIP_PRODUCT_KEY = "dFfHl"`
   - `PAYHIP_30D_CURRENCY = "USD"`
   - `PAYHIP_30D_PRICE_CENTS = "2150"` **قيمة مؤقتة مشروطة**؛ اضبطها لتساوي السعر الحقيقي في Payhip بالسنت تماماً. إذا سعّرت خطة Payhip مثلاً 20 دولارًا، اضبطها إلى `2000`، لا `2150`.
5. من حساب Payhip افتح `https://payhip.com/settings/developer` واحصل على API key بشكل سري. من Cloudflare شغّل `npx wrangler secret put PAYHIP_API_KEY`. **لا ترسل API key في المحادثة ولا تضعه في ملفات الموقع العامة.**
6. أكمل إعداد مفاتيح تسجيل الدخول والبريد من دليل README، مثل `RESEND_API_KEY` و`EMAIL_FROM` و`PUBLIC_BASE_URL` و`ADMIN_EMAIL`، والاسم والعنوان القانونيين والبريد العام للمشروع.
7. شغّل `npm run deploy` واذهب إلى رابط موقعك العام.

## الخطوات على Payhip
1. انتقل إلى **Account / Settings → Developer**.
2. الصق عنوان `https://YOUR-SITE/api/webhook/payhip` في خانة webhook (استبدل YOUR-SITE بعنوان موقعك الفعلي).
3. اختر حدثي **paid** و **refunded**؛ لا نحتاج إلى subscription.created أو subscription.deleted للدفعة الواحدة.
4. **سجّل الحساب في PaediaSprint أولاً، وتأكد من البريد قبل الدفع، واستخدم البريد الإلكتروني نفسه عند Checkout على Payhip.** خلاف ذلك سيبقى الدفع غير مربوط بحساب حتى تتحقق المطابقة، وقد يلزم تدخل الدعم.
5. اضبط وصف خطة Payhip بأنه **30 days of access to the external PaediaSprint platform — one-time purchase, no automatic renewal** حتى لا يكون ثمة التباس مع محتوى Payhip الخاص.
6. اختبر شراءً مسموحًا به وظهور webhook في السجلات، وحالة العضوية عند `/api/me`، وانتهاء الوصول بعد 30 يومًا، واسترداد المبلغ. يُفضّل إجراء اختبار شراء حي منخفض القيمة بعد تهيئة بوابة الدفع، وفق شروط المزود.

## متى تُفتح المبيعات؟
**بعد فقط** التحقق من حقوق إعادة نشر المحتوى، مراجعة علمية مستقلة للأسئلة والإجابات، توافق رخصة VAREXO مع نشاط التدريب الرقمي، واكتمال فحص الدفع، ضع في `wrangler.toml`:
- `SALES_ENABLED = "true"`
- `EDITORIAL_APPROVED = "true"`
- `CONTENT_RIGHTS_CONFIRMED = "true"`

هذه ليست توصية لتبديلها الآن. اتركها `false` حتى إكمال المتطلبات. يلزم أيضاً تفعيل حساب PayPal/Payhip للتحصيل والسحب إلى حسابك.

## حدود معروفة
- لا يمكننا التحقق من سعر خطة Payhip أو استقبال حدث Payhip الحقيقي داخل هذه الجلسة؛ لذلك يعتمد التفعيل على حدث واقعي وتجربة نهائية.
- التوقيع المستعمل مبني على توثيق Payhip الرسمي: SHA-256 لمفتاح API الخاص؛ لا يوجد مفتاح عام مشارك في الواجهة.
- لا تُمنح صلاحيات تلقائيًا عند مجرد الرجوع إلى الموقع أو إدخال رابط للطلب. التفعيل يحدث حصراً عبر webhook متحقق منه على الخادم.
- الكود جاهز للتجربة والنشر البرمجي، ولكنه **غير منشور** ولا يمكن ضمان خلوه من جميع الأخطاء دون بيئة الإنتاج.

المراجع:
- https://help.payhip.com/article/115-webhooks
- https://help.payhip.com/article/68-add-payhip-to-your-website
- https://help.payhip.com/article/306-add-payhip-to-shopify
