# ثيرا — جدول الميزات

**ثيرا** منصة ويب **ثنائية اللغة (الإنجليزية / العربية)** للصحة النفسية: أدوات ذاتية، معالجون بشر، حجز، دفع، وجلسات فيديو. يربط هذا المستند القدرات بأهم **المسارات** و**وحدات واجهة البرمجة** (تحت `src/routes/`).

---

## للمتعلمين والعائلات (المرضى)

| القدرة | المكان في الشفرة |
|--------|-------------------|
| الصفحة الرئيسية والتسويق والثقة والذكاء الاصطناعي | `/` — `index.tsx` |
| كيف نعمل، الأسئلة الشائعة، من نحن، اتصل بنا | `/how-it-works`، `/faq`، `/about`، `/contact` |
| المدونة | `/blog`، `/blog/$slug` |
| الصفحات القانونية | `/privacy`، `/terms` |
| التسجيل وتسجيل الدخول وإعادة التعيين والتحقق من البريد | `/auth/*`، `/login`، `/signup` |
| اختيار الدور والتهيئة | `/auth/role`، `/onboarding/$role` |
| استعراض المعالجين وتفاصيل الملف | `/therapists`، `/therapists/$id` |
| حجز جلسة | `/book/$therapistId` |
| الدفع: بطاقة (Polar) أو إنستاباي وإثبات التحويل | `/checkout/$bookingId` ومسارات النجاح/الإلغاء |
| لوحة التحكم: المزاج، الأجواء، الإنجازات، الإشعارات، الملف، الأمان | `/dashboard/$role/*` للأدوار `adult`، `parent`، `teen` |
| ولي الأمر: الأطفال المرتبطون | `/dashboard/parent/children` |
| الجلسات القادمة وغرفة الفيديو | `/dashboard/$role/sessions`، `.../sessions/$id` |
| الحجوزات | `/dashboard/$role/bookings` |
| تقارير الجلسات (قراءة) | `/dashboard/$role/reports` |
| محادثة الذكاء الاصطناعي (تدفق) | `/dashboard/$role/chat` |
| المدفوعات المعلقة والإثباتات حيث ينطبق | `/dashboard/$role/pending` |

**واجهات برمجة الخادم للمرضى**

- `POST /api/booking/lock` — حجز الفتحة وإنشاء حجز بحالة انتظار الدفع  
- `POST /api/booking/cancel` — إلغاء وفق القواعد  
- `POST /api/polar/checkout` — بدء دفع البطاقة (أو مسار تجريبي إن لم يُضبط Polar)  
- `POST /api/instapay/proof` — رفع إثبات التحويل للمراجعة اليدوية  
- `GET /api/sessions/$id/token` — رمز غرفة Daily (وضع تجريبي دون مفتاح Daily)  
- `POST /api/sessions/$id/end` — إنهاء الجلسة (مع فحص الصلاحيات في الشفرة)  
- `POST /api/ai/chat`، `intake`، `crisis-check`، `summarize`، `transcribe` — ميزات الذكاء الاصطناعي على الخادم  

---

## للمعالجين

| القدرة | المكان في الشفرة |
|--------|-------------------|
| غلاف لوحة المعالج | `/dashboard/therapist` |
| التوفر والفتحات | `/dashboard/therapist/availability` |
| إعدادات إنستاباي (رابط فقط — لا واجهة برمجة تطبيقات لإنستاباي) | `/dashboard/therapist/instapay` |
| إدارة الجلسات والغرفة الحية | `/dashboard/therapist/sessions`، `.../sessions/$id` |
| الحجوزات | `/dashboard/therapist/bookings` |
| الموافقات والطلبات | `/dashboard/therapist/approvals` |
| تقرير ما بعد الجلسة | تدفقات المعالج + `POST /api/reports/create` |
| الملف الشخصي | `/dashboard/therapist/profile` |
| الإشعارات والمزاج وغيرها حسب تفعيل الدور | تحت `/dashboard/therapist/*` |

---

## للمسؤولين

| القدرة | المكان في الشفرة |
|--------|-------------------|
| مناطق لوحة المسؤول | `/dashboard/admin/*` |
| المستخدمون، الجلسات، المدفوعات، التحليلات | مسارات `users`، `sessions`، `payments`، `analytics` |
| سجلات الذكاء الاصطناعي | `/dashboard/admin/ai-logs` |
| المحتوى والإعدادات | `/dashboard/admin/content`، `/dashboard/admin/settings` |
| الموافقة على المعالج | الواجهة + `POST /api/admin/approve-therapist` |
| تغيير حالة المستخدم | `POST /api/admin/users/status` |
| التحقق من إثبات إنستاباي (صلاحية أعلى) | `POST /api/admin/instapay/verify` |

---

## المنصة والسلامة

| الموضوع | ملاحظات التنفيذ |
|---------|------------------|
| الواجهة ثنائية اللغة | مزود i18n ونصوص المكوّنات؛ دعم اتجاه RTL للعربية |
| المصادقة | Firebase Auth؛ يتحقق الخادم من رمز `Bearer` في مسارات API |
| التفويض | قواعد أمان Firestore وفحوصات لكل مسار على الخادم |
| سلامة الذكاء الاصطناعي | مسارات ذات صلة بالأزمات تحت `src/routes/api/ai/` |
| نموذج البيانات | الأنواع في `src/lib/types.ts` |
| المهام الخلفية | Cloud Functions: تذكيرات، تقليم السجلات، انتهاء انتظار الدفع — راجع ARCHITECTURE.md |
| البريد | Resend من الدوال لأحداث محددة؛ قد تُسجَّل إشعارات في Firestore أيضاً |

---

## الخدمات الخارجية (ملخص)

| الخدمة | الدور في ثيرا |
|--------|----------------|
| Firebase | المصادقة، Firestore، التخزين، الدوال المجدولة |
| Vercel | استضافة تطبيق TanStack Start وكل مسارات `/api/*` |
| Google Gemini | استدعاءات النموذج من Vercel |
| Daily.co | غرف الفيديو والرموز من Vercel |
| Polar | الدفع بالبطاقة وخطاف الويب على Vercel |
| Resend | البريد الصادر من Cloud Functions |

---

## فهرس الوثائق

- [ARCHITECTURE.md](./ARCHITECTURE.md) — المخططات والبيئة (إنجليزي)  
- [ar/ARCHITECTURE.md](./ar/ARCHITECTURE.md) — ملخص عربي  
- [DEPLOYMENT.md](./DEPLOYMENT.md) — النشر والإعداد  
- [README.md](../README.md) — مقدمة المشروع  
