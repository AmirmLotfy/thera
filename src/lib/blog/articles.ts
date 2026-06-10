/** Hardcoded blog articles — single source of truth for /blog routes */
export type BlogArticle = {
  id: string;
  slug: string;
  category: string;
  status: "published";
  en: { title: string; excerpt: string; body: string };
  ar: { title: string; excerpt: string; body: string };
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: "seo-online-therapy-egypt",
    slug: "online-therapy-egypt",
    category: "therapy",
    status: "published",
    en: {
      title: "Online therapy in Egypt: what to expect and how to start",
      excerpt:
        "A practical guide to finding bilingual mental health support from home — privacy, cost, and your first session.",
      body: `Asking for help with your mental health in Egypt is becoming easier — but knowing where to start can still feel overwhelming. Online therapy lets you speak with a licensed professional from home, on your schedule, often in Arabic, English, or both.

Many people in Egypt choose online sessions because travel, work hours, or family privacy make in-person visits difficult. A good platform will explain how sessions work, what you pay, and how your data is protected before you book.

What online therapy can help with

Online therapy is effective for anxiety, low mood, relationship stress, grief, parenting challenges, and everyday burnout. It is not a substitute for emergency care — if you or someone else is in immediate danger, call 123 or 122 inside Egypt, or reach mental health lines such as 16328.

How to choose a therapist online

Look for clear credentials, specialties that match your concern, and language you are comfortable in. Read the therapist's bio, check session format (video or audio), and notice whether the platform reviews applications manually rather than listing anyone who signs up.

Privacy matters. Your conversations and clinical notes should be encrypted and visible only to you and your therapist — not used to train public AI models.

Your first session

Before the call, find a private spot, test your connection, and write down two or three things you want to discuss. It is normal to feel nervous; therapists are trained to help you settle in. You do not need a perfect story — starting with "I'm not sure where to begin" is enough.

Thera is built in Egypt for bilingual users: calm AI support when you need to think out loud, and vetted human therapists when you are ready for deeper work. If online therapy feels right for you, browse profiles, book a slot, and take the first step at your own pace.`,
    },
    ar: {
      title: "العلاج النفسي أونلاين في مصر: ماذا تتوقع وكيف تبدأ",
      excerpt:
        "دليل عملي للعثور على دعم نفسي ثنائي اللغة من المنزل — الخصوصية والتكلفة وأول جلسة.",
      body: `طلب المساعدة في صحتك النفسية في مصر أصبح أسهل — لكن معرفة من أين تبدأ قد يبقى مرهقًا. العلاج أونلاين يتيح لك التحدث مع متخصص مرخّص من منزلك، في وقت يناسبك، غالبًا بالعربية أو الإنجليزية أو كليهما.

كثيرون في مصر يختارون الجلسات عن بُعد لأن التنقل أو ساعات العمل أو خصوصية العائلة تجعل الزيارة الشخصية صعبة. منصة جيدة تشرح كيف تعمل الجلسات وماذا تدفع وكيف تُحمى بياناتك قبل الحجز.

ما الذي يمكن أن يساعدك العلاج أونلاين فيه؟

العلاج عن بُعد فعّال للقلق، والحزن، وضغط العلاقات، والفقد، وتحديات التربية، والإرهاق اليومي. لا يُغني عن الرعاية الطارئة — إن كنت أنت أو شخصًا آخر في خطر فوري داخل مصر، اتصل بـ 123 أو 122، أو بخطوط الدعم النفسي مثل 16328.

كيف تختار معالجًا أونلاين؟

ابحث عن أوراق اعتماد واضحة، وتخصصات تناسب مشكلتك، ولغة تشعر بالراحة فيها. اقرأ السيرة، وتحقق من شكل الجلسة (فيديو أو صوت)، ولاحظ إن كانت المنصة تراجع الطلبات يدويًا بدل إدراج أي شخص يسجّل.

الخصوصية مهمة. محادثاتك وملاحظاتك السريرية يجب أن تكون مشفّرة ولا يراها إلا أنت ومعالجك — ولا تُستخدم لتدريب نماذج ذكاء اصطناعي عامة.

جلستك الأولى

قبل الاتصال، اختر مكانًا خاصًا، اختبر الاتصال، واكتب نقطتين أو ثلاث تريد مناقشتها. طبيعي أن تشعر بالتوتر؛ المعالجون مدربون لمساعدتك على الاستقرار. لا تحتاج قصة مثالية — أن تبدأ بـ «لست متأكدًا من أين أبدأ» يكفي.

ثيرا مبنية في مصر لمستخدمين ثنائيي اللغة: دعم ذكي هادئ حين تحتاج التفكير بصوت عالٍ، ومعالجون بشريون معتمدون حين تكون مستعدًا لعمل أعمق. إن شعرت أن العلاج أونلاين يناسبك، تصفّح الملفات، احجز موعدًا، وخُطْ الخطوة الأولى بوتيرتك.`,
    },
  },
  {
    id: "seo-when-to-see-a-therapist",
    slug: "when-to-see-a-therapist",
    category: "awareness",
    status: "published",
    en: {
      title: "When to see a therapist: signs it's time (without alarm)",
      excerpt:
        "You do not need a crisis to deserve support. Here are gentle signals that talking to a professional could help.",
      body: `There is a myth that therapy is only for emergencies. In reality, many people start when life simply feels heavier than usual — and that is a valid reason.

You might benefit from therapy if stress lasts weeks and affects sleep, appetite, or focus. If you withdraw from people you care about, feel irritable most days, or replay the same worries without relief, a therapist can help you understand patterns and try new tools.

Physical signs count too: tension headaches, stomach issues, or exhaustion without a clear medical cause sometimes connect to emotional load. A doctor can rule out physical causes; therapy addresses the psychological side.

For parents and teens

Parents often seek support when a child's mood or behaviour changes at school or home. Teens may want a space that is not their parents or friends — someone trained to listen without judgment.

You do not need a diagnosis to book. Many sessions focus on decision-making, confidence, or life transitions: university, marriage, relocation, or grief.

What if I'm unsure?

A single consultation can clarify whether ongoing therapy makes sense. On Thera, you can also begin with the AI companion to organise your thoughts — then move to a human when you feel ready.

Seek emergency help if you have thoughts of harming yourself or others. In Egypt, call 123 or 122, or mental health support on 16328. Therapy complements — never replaces — urgent care.

Choosing to talk to someone is strength, not weakness. If several signs on this list resonate, consider browsing therapist profiles and booking a low-pressure first conversation.`,
    },
    ar: {
      title: "متى أراجع معالجًا نفسيًا؟ إشارات الوقت المناسب (بدون إثارة خوف)",
      excerpt:
        "لا تحتاج أزمة لتستحق الدعم. إشارات لطيفة على أن الحديث مع متخصص قد يساعدك.",
      body: `هناك اعتقاد أن العلاج النفسي للطوارئ فقط. في الواقع، كثيرون يبدأون حين تشعر الحياة بثقل أكبر من المعتاد — وهذا سبب كافٍ.

قد تستفيد من العلاج إن استمر التوتر أسابيع وأثر على النوم أو الشهية أو التركيز. إن انسحبت من من تحب، أو شعرت بالتهيج أغلب الأيام، أو كررت نفس الهموم بلا راحة، يمكن للمعالج مساعدتك على فهم الأنماط وتجربة أدوات جديدة.

الأعراض الجسدية تُحسب أيضًا: صداع التوتر، اضطراب المعدة، أو إرهاق بلا سبب طبي واضح أحيانًا يرتبط بالحمل العاطفي. الطبيب يستبعد الأسباب الجسدية؛ العلاج يعالج الجانب النفسي.

للآباء والمراهقين

غالبًا ما يطلب الآباء الدعم حين يتغير مزاج الطفل أو سلوكه في المدرسة أو البيت. المراهقون قد يريدون مساحة ليست للوالدين أو الأصدقاء — شخصًا مدربًا على الاستماع بلا حكم.

لا تحتاج تشخيصًا للحجز. كثير من الجلسات تركز على اتخاذ القرار، أو الثقة، أو مراحل الحياة: الجامعة، الزواج، الانتقال، أو الفقد.

ماذا لو لم أكن متأكدًا؟

استشارة واحدة قد توضح إن كان العلاج المستمر مناسبًا. على ثيرا يمكنك أيضًا البدء بالمساعد الذكي لتنظيم أفكارك — ثم الانتقال لإنسان حين تكون مستعدًا.

اطلب مساعدة طارئة إن راودتك أفكار إيذاء نفسك أو غيرك. في مصر اتصل بـ 123 أو 122، أو دعم الصحة النفسية على 16328. العلاج يكمّل — لا يستبدل — الرعاية العاجلة.

اختيارك التحدث مع أحد قوة لا ضعف. إن تطابقت عدة إشارات في هذه القائمة، فكّر في تصفّح ملفات المعالجين وحجز محادثة أولى بلا ضغط.`,
    },
  },
  {
    id: "seo-anxiety-grounding-arabic",
    slug: "anxiety-grounding-arabic",
    category: "anxiety",
    status: "published",
    en: {
      title: "Grounding for anxiety: simple techniques in English and Arabic",
      excerpt:
        "Five evidence-informed practices you can use in under five minutes — at work, before sleep, or when panic rises.",
      body: `Anxiety often pulls you into the future or the past. Grounding brings attention to the present moment so your nervous system can settle. These techniques are not a cure — they are tools you can pair with therapy when needed.

Five-four-three-two-one

Name five things you can see, four you can touch, three you can hear, two you can smell, and one you can taste. Say them aloud in Arabic or English — whichever feels more natural. Slow down between each sense.

Box breathing

Breathe in for four counts, hold for four, out for four, hold for four. Repeat four cycles. If holding feels uncomfortable, skip the holds and keep equal in-and-out breaths.

Feet on the floor

Press your feet into the ground. Notice the contact — socks, tiles, carpet. Imagine roots growing from your soles. This works well under a desk or in a waiting room.

Kind phrase

Choose one short sentence: "This feeling will pass." / «هذا الشعور سيمضي». Repeat it on the exhale. You are not arguing with anxiety — you are reminding yourself it is temporary.

When to reach further

If grounding helps only briefly, or anxiety blocks daily life, consider speaking with a therapist. Thera offers bilingual support and calm AI check-ins between sessions.

If anxiety includes chest pain you have not checked medically, see a doctor. If you feel unsafe, use Egypt emergency lines: 123, 122, or 16328 for mental health support.

Practice one technique daily when you are calm so it is easier to reach for when stress spikes. Small, repeated care changes how your body learns safety over time.`,
    },
    ar: {
      title: "تأريض القلق: تقنيات بسيطة بالعربية والإنجليزية",
      excerpt:
        "خمس ممارسات مدعومة بالأدلة في أقل من خمس دقائق — في العمل، قبل النوم، أو حين يعلو الذعر.",
      body: `القلق غالبًا يسحبك للمستقبل أو الماضي. التأريض يعيد الانتباه للحظة الحالية حتى يهدأ جهازك العصبي. هذه التقنيات ليست علاجًا كاملًا — أدوات يمكنك دمجها مع العلاج النفسي عند الحاجة.

خمسة، أربعة، ثلاثة، اثنان، واحد

سمِّ خمسة أشياء تراها، أربعة تلمسها، ثلاثة تسمعها، اثنين تشمّهما، وواحدًا تتذوقه. قُلها بصوت عالٍ بالعربية أو الإنجليزية — أيهما أريح. أبطئ بين كل حاسة.

تنفس الصندوق

تنفّس داخل أربع عدات، احبس أربعًا، خارج أربعًا، احبس أربعًا. كرّر أربع دورات. إن كان الحبس مزعجًا، تجاوزه واجعل الشهيق والزفير متساويين.

القدمان على الأرض

اضغط قدميك في الأرض. لاحظ التماس — الجوارب، البلاط، السجاد. تخيّل جذورًا تنمو من باطن قدميك. ينفع تحت المكتب أو في غرفة الانتظار.

جملة لطيفة

اختر جملة قصيرة: «هذا الشعور سيمضي». / "This feeling will pass." كرّرها مع الزفير. أنت لا تجادل القلق — تذكّر نفسك أنه مؤقت.

متى تتقدم أكثر؟

إن ساعد التأريض قليلًا فقط، أو منع القلق حياتك اليومية، فكّر بالتحدث مع معالج. ثيرا تقدم دعمًا ثنائي اللغة وتسجيلات هادئة مع الذكاء الاصطناعي بين الجلسات.

إن كان القلق مع ألم صدر لم تفحصه طبيًا، راجع طبيبًا. إن شعرت بعدم الأمان، استخدم خطوط الطوارئ في مصر: 123، 122، أو 16328 للدعم النفسي.

تدرّب على تقنية واحدة يوميًا وأنت هادئ لتسهيل استخدامها حين يعلو التوتر. رعاية صغيرة متكررة تغيّر كيف يتعلم جسدك الأمان مع الوقت.`,
    },
  },
];

/** @deprecated Use BLOG_ARTICLES */
export const SEO_ARTICLES = BLOG_ARTICLES;

export function articleBySlug(slug: string) {
  const found = BLOG_ARTICLES.find((a) => a.slug === slug);
  if (!found) return null;
  const { id, slug: s, category, status, cover, en, ar } = found;
  return { id, slug: s, category, status, cover, en, ar };
}
