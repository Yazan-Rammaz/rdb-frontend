# سجل قرارات البنية التقنية: تقسيم Pages و Worker والدومين المخصص لـ WebAuthn

**المؤلف:** يزن
**التاريخ:** 2026-06-03
**الحالة:** مُنفَّذ

---

## ملخص تنفيذي

يوضّح هذا المستند ثلاثة قرارات بنيوية مترابطة اتخذناها على البنية التحتية:

1. نقل الواجهة الأمامية من **Cloudflare Workers** إلى **Cloudflare Pages**
2. الإبقاء على SDK الخاص بـ KYC على **Cloudflare Worker** مستقل
3. تسجيل دومين حقيقي (`ramaaz-digital-bank.online`) بدلاً من استخدام النطاقات الفرعية المجانية `*.workers.dev` / `*.pages.dev`

كل قرار من هذه القرارات فُرض بقيود تقنية صارمة، وليس مجرد تفضيل شخصي.

---

## القرار الأول — الواجهة الأمامية: من Workers إلى Pages

### لماذا كنا على Workers؟

كان النشر الأولي يعتمد على Worker لتقديم واجهة Next.js عبر محوّل `@cloudflare/next-on-pages`. كان هذا كافياً في مرحلة النماذج الأولية.

### لماذا انتقلنا إلى Pages؟

**Cloudflare Pages هو البيئة الرسمية والمدعومة لتشغيل Next.js على Cloudflare.** بيئة Workers تعاني من تعارض جوهري مع Next.js App Router:

| القيد | Workers | Pages |
|---|---|---|
| دعم Next.js App Router | جزئي / غير مدعوم | كامل عبر `@cloudflare/next-on-pages` |
| واجهات Edge Runtime (Request, Response, crypto) | مجموعة فرعية فقط | معايير الويب الكاملة |
| تقديم الملفات الثابتة | يتطلب ربط KV يدوياً | أصلي، بدون أي إعداد |
| التكامل مع البناء | نشر يدوي عبر wrangler | مرتبط بـ Git، تلقائي |
| دعم Middleware | يتعطل مع المسارات المعقدة | مدعوم بالكامل |
| تحسين `next/image` | غير متاح | متاح عبر Cloudflare Image Resizing |
| ترويسات Cache-Control | يدوية | تلقائية من إعدادات Next.js |

الخطأ المحدد الذي كسر النشر على Workers كان قيود **Edge Runtime**: Workers تتيح فقط مجموعة فرعية من Web Crypto API ولا تدعم جميع الـ APIs المتوافقة مع Node.js التي تعتمد عليها middleware وServer Actions في Next.js. Pages تعمل على نفس البنية التحتية لكن مع مجموعة كاملة من Web Standard APIs مُربوطة بشكل صحيح، ولهذا السبب توثيق Cloudflare نفسه يوصي صراحةً بـ Pages لتطبيقات Next.js.

محاولة التحايل على هذه القيود داخل Workers كانت ستعني الحفاظ على shim توافقية مخصصة تنكسر مع كل تحديث لـ Next.js — عبء صيانة غير مستدام.

**القرار: Pages هو بيئة التشغيل الصحيحة والمدعومة لهذه الواجهة الأمامية. هذه ليست مجرد حلًّا مؤقتًا؛ بل هي البنية المقصودة.**

---

## القرار الثاني — SDK الخاص بـ KYC: يبقى على Worker مستقل

### لماذا لا يمكن نقل KYC SDK إلى Pages؟

SDK التحقق من الهوية (KYC) — الذي يشمل التحقق من الهوية، مسح الوثائق، وكشف الحيوية — يشغّل منطقاً من جانب الخادم غير متوافق مع نموذج Pages Functions:

1. **العمليات طويلة الأمد.** التحقق من KYC يتضمن استدعاءات API متسلسلة لمزود خارجي بمهلات زمنية تتجاوز حد وقت CPU لـ Pages Functions. Workers على الخطة المدفوعة تدعم حدوداً أعلى لوقت CPU وهي البيئة الصحيحة لهذا الغرض.

2. **الاستجابات الثنائية والمتدفقة.** SDK يعمل كبروكسي لرفع صور الوثائق كـ multipart streams. Pages Functions لها قيود على حجم جسم الطلب وسلوك التدفق، بينما Worker يتعامل مع هذا بشكل أصلي.

3. **عزل نطاق الأسرار.** مفاتيح KYC API وأسرار التوقيع يجب ألا تعيش في نفس نشرة الواجهة الأمامية. إبقاء KYC Worker منفصلاً يفرض حداً أمنياً صارماً: نشرة Pages للواجهة الأمامية لا تملك أي وصول إلى بيانات اعتماد KYC.

4. **التوسع والنشر المستقل.** حمل التحقق من KYC غير قابل للتنبؤ (يرتفع خلال حملات التسجيل). Worker مخصص يمكن توسيعه، تحديد معدله، ونشره بشكل مستقل دون المساس بخط أنابيب نشر الواجهة الأمامية.

5. **متطلبات Runtime API.** يستخدم KYC SDK الـ `crypto.subtle` لتوقيع الطلبات ويبثّ أجسام `ReadableStream` — APIs متاحة بالكامل في بيئة Workers لكن لها حالات حافة معروفة في Pages Functions عند دمجها مع middleware.

### البنية المعمارية

```
المتصفح / تطبيق الجوال
       │
       ├──► Cloudflare Pages  (واجهة Next.js الأمامية، جميع مسارات UI)
       │
       └──► Cloudflare Worker (بروكسي KYC SDK، مسارات /api/kyc/*)
                   │
                   └──► مزود KYC الخارجي (API)
```

هذا التقسيم نمط راسخ في توثيق Cloudflare نفسه (نمط "Backend for Frontend" أو BFF). ليس هندسة مبالغاً فيها — إنه الحد الأدنى من الفصل الضروري بسبب القيود التقنية لكل بيئة تشغيل.

---

## القرار الثالث — الدومين الحقيقي: `ramaaz-digital-bank.online`

هذا هو القرار الأكثر أهمية، والأكثر تأثيراً مباشراً على المنتج.

### المشكلة: WebAuthn / Passkeys مرتبطة بدومين مسجّل

WebAuthn — المعيار الذي يقف وراء Face ID، بصمة الإصبع، Windows Hello، وبيانات اعتماد Google Password Manager — يعمل بربط بيانات الاعتماد بـ **RP ID** (معرّف الطرف المعتمد)، وهو دائماً **لاحقة دومين قابلة للتسجيل**.

مواصفات W3C WebAuthn، القسم 5.4.1، تنص على:

> *"يجب أن يكون RP ID لاحقة دومين قابلة للتسجيل، أو مساوياً للدومين الفعّال لأصل المُستدعي."*

`workers.dev` و `pages.dev` مدرجتان في **قائمة اللواحق العامة (PSL)**. هذا يعني:

- `ramaaz.workers.dev` و `another-app.workers.dev` تُعامَل كـ **دومينات مختلفة قابلة للتسجيل**.
- **لا يمكن تعيين RP ID على `workers.dev` أو `pages.dev`** لأنهما لاحقتان عامتان، وليستا دومينات مملوكة.
- أي passkey مسجّل على `ramaaz.workers.dev` مرتبط بشكل دائم ولا رجعة فيه بهذا النطاق الفرعي تحديداً، ولا يمكن استخدامه من أي أصل آخر.

### لماذا هذا يُفشل حالة الاستخدام على الجوال + الويب

تطبيقنا يضم **واجهة ويب** و**تطبيق Android** (مع خطة لـ iOS). لكي يسجّل المستخدم بصمة إصبع واحدة أو Face ID ويستخدمها على الويب والجوال معاً، يجب أن يكون WebAuthn RP ID **هو نفسه على المنصتين**.

| المنصة | المتطلب |
|---|---|
| الويب (المتصفح) | RP ID يجب أن يطابق الدومين القابل للتسجيل للصفحة |
| Android (FIDO2 / Digital Asset Links) | RP ID يجب أن يطابق `assetlinks.json` المستضاف على `https://<rp-id>/.well-known/assetlinks.json` |
| iOS (Passkeys) | RP ID يجب أن يطابق `apple-app-site-association` على `https://<rp-id>/.well-known/apple-app-site-association` |

**Android يرفض قطعياً `workers.dev` و`pages.dev` كـ RP IDs.** تطبيق FIDO2 من Google على Android يتحقق من أن RP ID هو دومين مسجّل حقيقي يتحكم فيه ناشر التطبيق — فالدومين الموجود على قائمة اللواحق العامة يفشل هذا الفحص كلياً. وهذا مفروض على مستوى نظام التشغيل ولا يمكن تجاوزه.

### ما الذي يتعطل بدون دومين حقيقي؟

| الميزة | `*.workers.dev` / `*.pages.dev` | `ramaaz-digital-bank.online` |
|---|---|---|
| تسجيل passkey على الويب | ✅ يعمل (معزول على ذلك النطاق الفرعي) | ✅ يعمل |
| تسجيل passkey على Android | ❌ مرفوض من نظام التشغيل | ✅ يعمل |
| نفس الـ passkey قابل للاستخدام على الويب وAndroid | ❌ مستحيل | ✅ يعمل |
| مزامنة Google Password Manager | ❌ محجوب (دومين PSL) | ✅ يعمل |
| مزامنة بيانات اعتماد Windows Hello | ❌ محجوب | ✅ يعمل |
| التحقق من `assetlinks.json` | ❌ Android يرفض دومينات PSL | ✅ محقَّق |
| Face ID / Touch ID على iOS | ❌ محجوب (دومين PSL) | ✅ يعمل |

### ملف `assetlinks.json`

ملف `assetlinks.json` (الموجود بالفعل في جذر المستودع) هو الآلية التي تتحقق من خلالها Android من أن دومين الويب وتطبيق Android يخضعان لسيطرة نفس الناشر. يجب تقديمه على:

```
https://ramaaz-digital-bank.online/.well-known/assetlinks.json
```

خدمات Google Play تجلب هذا الملف عندما يحاول المستخدم استخدام passkey على Android. إذا لم يكن الدومين دومين مسجّل حقيقي — أو إذا كان لاحقة عامة مشتركة مثل `workers.dev` — فإن Google ترفض المصافحة بالكامل. لا يوجد أي حل بديل.

### الفائدة الأمنية للدومين المخصص

بعيداً عن WebAuthn، امتلاك الدومين يوفّر:

- **شهادة TLS تحت سيطرتنا** — وليس بنية تحتية مشتركة
- **القدرة على تعيين HSTS preload** — يحمي المستخدمين من SSL stripping
- **ترويسات CSP وأمنية مخصصة** — لا تُستبدل بإعدادات Cloudflare الافتراضية للنطاقات الفرعية المشتركة
- **إشارات ثقة احترافية** — تطبيق مصرفي على `workers.dev` سيفشل فوراً في أي مراجعة أمنية أو امتثال تنظيمي

---

## ملخص القرارات

| القرار | النهج المختار | البديل الذي تم النظر فيه | لماذا رُفض البديل |
|---|---|---|---|
| استضافة الواجهة الأمامية | Cloudflare Pages | Cloudflare Workers | Workers يفتقر إلى دعم Edge Runtime الكامل لـ Next.js App Router؛ Pages هو الهدف المدعوم رسمياً |
| استضافة KYC SDK | Cloudflare Worker مخصص | Pages Functions | قيود CPU، قيود التدفق، العزل الأمني لبيانات الاعتماد |
| الدومين | `ramaaz-digital-bank.online` (مسجّل) | `*.workers.dev` / `*.pages.dev` | دومينات PSL مرفوضة من Android FIDO2؛ WebAuthn RP ID لا يمكنه تغطية المنصات على لاحقة عامة |

---

## المراجع

- [توثيق Cloudflare — نشر Next.js على Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [مواصفات W3C WebAuthn — RP ID (§5.4.1)](https://www.w3.org/TR/webauthn-2/#rp-id)
- [FIDO Alliance — Android FIDO2 API](https://developers.google.com/identity/fido/android/native-apps)
- [Google — Digital Asset Links (assetlinks.json)](https://developers.google.com/digital-asset-links/v1/getting-started)
- [قائمة Mozilla للواحق العامة](https://publicsuffix.org/)
- [Cloudflare — Workers مقابل Pages Functions](https://developers.cloudflare.com/workers/platform/workers-vs-pages-functions/)
