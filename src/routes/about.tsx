import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { useI18n } from "@/i18n/I18nProvider";
import { Heart, Globe, ShieldCheck, Compass } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Thera" },
      { name: "description", content: "Thera is a bilingual mental wellness platform built to make support easy, calm, and trusted." },
      { property: "og:title", content: "About — Thera" },
      { property: "og:description", content: "Our mission, our values, and the people building Thera." },
    ],
  }),
  component: AboutPage,
});

const valueIcons = [Heart, Globe, ShieldCheck, Compass] as const;

const teamMembers = [
  { name: "Menna Mohamed", roleEn: "UI/UX · AI Implementation", roleAr: "واجهات المستخدم · تنفيذ الذكاء الاصطناعي" },
  { name: "Mohamed Ahmed", roleEn: "Frontend", roleAr: "تطوير الواجهة الأمامية" },
  { name: "Raneem Elsaeed", roleEn: "Database engineer", roleAr: "مهندسة قواعد بيانات" },
  { name: "Merna Mohamed", roleEn: "Backend", roleAr: "تطوير الخلفية" },
] as const;

function renderTeamAvatar(name: string) {
  if (name === "Menna Mohamed") {
    return (
      <svg className="h-full w-full select-none" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-menna" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E0C3FC" />
            <stop offset="100%" stopColor="#8EC5FC" />
          </linearGradient>
        </defs>
        <rect width="160" height="160" rx="24" fill="url(#grad-menna)" />
        <circle cx="80" cy="85" r="30" fill="#1F1B2E" />
        <path d="M50 85C50 55 110 55 110 85C110 90 50 90 50 85Z" fill="#1F1B2E" />
        <circle cx="55" cy="55" r="12" fill="#1F1B2E" />
        <circle cx="105" cy="55" r="12" fill="#1F1B2E" />
        <circle cx="80" cy="88" r="22" fill="#FCEADE" />
        <path d="M58 75C65 65 75 70 80 72C85 70 95 65 102 75C95 72 65 72 58 75Z" fill="#1F1B2E" />
        <circle cx="69" cy="85" r="9" stroke="#1F1B2E" strokeWidth="2.5" fill="none" />
        <circle cx="91" cy="85" r="9" stroke="#1F1B2E" strokeWidth="2.5" fill="none" />
        <path d="M78 85H82" stroke="#1F1B2E" strokeWidth="2.5" />
        <path d="M56 83H60" stroke="#1F1B2E" strokeWidth="2" />
        <path d="M100 83H104" stroke="#1F1B2E" strokeWidth="2" />
        <circle cx="63" cy="94" r="3" fill="#FFB3B3" opacity="0.8" />
        <circle cx="97" cy="94" r="3" fill="#FFB3B3" opacity="0.8" />
        <rect x="74" y="108" width="12" height="12" fill="#FCEADE" />
        <path d="M50 120C50 115 60 112 80 112C100 112 110 115 110 120V136H50V120Z" fill="#724CF9" />
        <path d="M30 40L33 45L38 46L33 49L32 54L29 49L24 48L29 45L30 40Z" fill="#FFD166" />
        <path d="M132 100L134 104L139 105L134 108L133 113L130 108L125 107L130 104L132 100Z" fill="#FFD166" />
        <rect x="125" y="32" width="10" height="10" rx="2" transform="rotate(15 125 32)" fill="#FFFFFF" opacity="0.9" />
        <circle cx="34" cy="112" r="5" fill="#FFFFFF" opacity="0.8" />
      </svg>
    );
  }

  if (name === "Mohamed Ahmed") {
    return (
      <svg className="h-full w-full select-none" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-mohamed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A1C4FD" />
            <stop offset="100%" stopColor="#C2FDE6" />
          </linearGradient>
        </defs>
        <rect width="160" height="160" rx="24" fill="url(#grad-mohamed)" />
        <circle cx="80" cy="85" r="28" fill="#1A1829" />
        <circle cx="80" cy="88" r="22" fill="#E8C3A7" />
        <path d="M52 82C50 60 70 52 80 52C95 52 110 60 108 82C102 82 100 70 80 70C60 70 58 82 52 82Z" fill="#1A1829" />
        <rect x="58" y="81" width="18" height="11" rx="4" stroke="#1A1829" strokeWidth="2.5" fill="none" />
        <rect x="84" y="81" width="18" height="11" rx="4" stroke="#1A1829" strokeWidth="2.5" fill="none" />
        <path d="M76 85H84" stroke="#1A1829" strokeWidth="2.5" />
        <path d="M52 88C52 65 108 65 108 88" stroke="#724CF9" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <rect x="46" y="80" width="10" height="18" rx="5" fill="#724CF9" />
        <rect x="104" y="80" width="10" height="18" rx="5" fill="#724CF9" />
        <rect x="74" y="108" width="12" height="12" fill="#E8C3A7" />
        <path d="M52 120C52 115 62 112 80 112C98 112 108 115 108 120V136H52V120Z" fill="#1E293B" />
        <path d="M74 112L80 118L86 112" stroke="#E8C3A7" strokeWidth="2" />
        <path d="M26 65L18 70L26 75" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M134 65L142 70L134 75" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="34" cy="38" r="4" fill="#FFFFFF" opacity="0.8" />
        <circle cx="128" cy="115" r="6" fill="#724CF9" opacity="0.3" />
      </svg>
    );
  }

  if (name === "Raneem Elsaeed") {
    return (
      <svg className="h-full w-full select-none" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-raneem" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B3FFAB" />
            <stop offset="100%" stopColor="#12FFF7" />
          </linearGradient>
        </defs>
        <rect width="160" height="160" rx="24" fill="url(#grad-raneem)" />
        <circle cx="80" cy="85" r="30" fill="#2E1F1B" />
        <path d="M50 85C50 55 110 55 110 85C110 90 50 90 50 85Z" fill="#2E1F1B" />
        <path d="M50 85V118C50 118 56 122 62 118C68 114 74 118 80 118C86 118 92 114 98 118C104 122 110 118 110 118V85" fill="#2E1F1B" />
        <circle cx="80" cy="88" r="22" fill="#FEE1D2" />
        <path d="M58 75C68 64 78 72 80 72C82 72 92 64 102 75C95 71 65 71 58 75Z" fill="#2E1F1B" />
        <path d="M60 76C70 69 90 69 100 76" stroke="#FFA69E" strokeWidth="3" fill="none" />
        <path d="M66 88C68 90 72 90 74 88" stroke="#2E1F1B" strokeWidth="2" strokeLinecap="round" />
        <path d="M86 88C88 90 92 90 94 88" stroke="#2E1F1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="64" cy="94" r="2.5" fill="#FF9E9E" opacity="0.8" />
        <circle cx="96" cy="94" r="2.5" fill="#FF9E9E" opacity="0.8" />
        <rect x="74" y="108" width="12" height="12" fill="#FEE1D2" />
        <path d="M50 120C50 115 60 112 80 112C100 112 110 115 110 120V136H50V120Z" fill="#0EA5E9" />
        <circle cx="28" cy="40" r="7" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="48" cy="28" r="5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="24" cy="62" r="5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="28" y1="40" x2="48" y2="28" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
        <line x1="28" y1="40" x2="24" y2="62" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" />
        <rect x="120" y="35" width="22" height="11" rx="3" fill="#FFFFFF" opacity="0.9" stroke="#0EA5E9" strokeWidth="1.5" />
        <circle cx="125" cy="40.5" r="1.5" fill="#22C55E" />
        <circle cx="130" cy="40.5" r="1.5" fill="#22C55E" />
        <rect x="120" y="50" width="22" height="11" rx="3" fill="#FFFFFF" opacity="0.9" stroke="#0EA5E9" strokeWidth="1.5" />
        <circle cx="125" cy="55.5" r="1.5" fill="#22C55E" />
        <circle cx="130" cy="55.5" r="1.5" fill="#22C55E" />
      </svg>
    );
  }

  if (name === "Merna Mohamed") {
    return (
      <svg className="h-full w-full select-none" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-merna" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9966" />
            <stop offset="100%" stopColor="#FF5E62" />
          </linearGradient>
        </defs>
        <rect width="160" height="160" rx="24" fill="url(#grad-merna)" />
        <circle cx="80" cy="85" r="30" fill="#1C1A2E" />
        <path d="M50 85C50 55 110 55 110 85C110 90 50 90 50 85Z" fill="#1C1A2E" />
        <circle cx="80" cy="88" r="22" fill="#FDDFCD" />
        <path d="M58 75C68 64 92 64 102 75C98 70 62 70 58 75Z" fill="#1C1A2E" />
        <circle cx="112" cy="72" r="11" fill="#1C1A2E" />
        <rect x="59" y="82" width="17" height="10" rx="3" stroke="#1C1A2E" strokeWidth="2" fill="none" />
        <rect x="84" y="82" width="17" height="10" rx="3" stroke="#1C1A2E" strokeWidth="2" fill="none" />
        <path d="M76 86H84" stroke="#1C1A2E" strokeWidth="2" />
        <path d="M76 97C78 99 82 97 84 97" stroke="#1C1A2E" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="63" cy="94" r="2.5" fill="#FF8E8E" opacity="0.8" />
        <circle cx="97" cy="94" r="2.5" fill="#FF8E8E" opacity="0.8" />
        <rect x="74" y="108" width="12" height="12" fill="#FDDFCD" />
        <path d="M50 120C50 115 60 112 80 112C100 112 110 115 110 120V136H50V120Z" fill="#3B0764" />
        <circle cx="34" cy="40" r="8" fill="#FFFFFF" opacity="0.85" />
        <circle cx="44" cy="36" r="10" fill="#FFFFFF" opacity="0.85" />
        <circle cx="54" cy="40" r="8" fill="#FFFFFF" opacity="0.85" />
        <rect x="34" y="40" width="20" height="8" fill="#FFFFFF" opacity="0.85" />
        <circle cx="132" cy="42" r="7" fill="#FFFFFF" opacity="0.75" />
        <path d="M132 32V35M132 49V52M122 42H125M139 42H142M125 35L127 37M137 47L139 49M125 49L127 47M137 35L139 37" stroke="#FF5E62" strokeWidth="2" strokeLinecap="round" />
        <circle cx="132" cy="42" r="3" fill="#FF5E62" />
        <circle cx="134" cy="108" r="4" fill="#FFFFFF" opacity="0.8" />
        <circle cx="28" cy="115" r="5" fill="#FFFFFF" opacity="0.7" />
      </svg>
    );
  }
  return <div className="aspect-square w-full rounded-2xl bg-muted" />;
}

function AboutPage() {
  const { t, locale, dir } = useI18n();
  const a = t.about;

  const values = [
    { Icon: valueIcons[0], title: a.val1t, body: a.val1b },
    { Icon: valueIcons[1], title: a.val2t, body: a.val2b },
    { Icon: valueIcons[2], title: a.val3t, body: a.val3b },
    { Icon: valueIcons[3], title: a.val4t, body: a.val4b },
  ];

  const story = [
    { year: a.story1year, title: a.story1title, body: a.story1body },
    { year: a.story2year, title: a.story2title, body: a.story2body },
    { year: a.story3year, title: a.story3title, body: a.story3body },
  ];

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div aria-hidden className="blob pointer-events-none absolute -left-24 -top-20 h-96 w-96 bg-lavender/60" />
        <div aria-hidden className="blob pointer-events-none absolute -right-20 top-40 h-80 w-80 bg-aqua/50" />
        <div className="relative mx-auto max-w-5xl px-5 pb-12 pt-hero-under-site-header md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.kicker}</p>
          <h1 className="hero-title hero-title-xl mt-4 max-w-3xl text-balance font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">
            {a.heroTitle}
          </h1>
          <p
            className={`mt-6 max-w-2xl text-ink-muted ${
              dir === "rtl" ? "text-lg leading-8 md:text-xl md:leading-9" : "text-lg leading-relaxed"
            }`}
          >
            {a.heroSub}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.valuesKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{a.valuesTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {values.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-border/70 bg-card p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blush/60"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-5 font-display text-2xl">{title}</h3>
              <p className="mt-2 text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.storyKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{a.storyTitle}</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {story.map((s) => (
            <div key={s.year} className="rounded-3xl border border-border/70 bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{s.year}</p>
              <h3 className="mt-3 font-display text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-muted">{a.teamKicker}</p>
        <h2 className="mt-2 font-display text-4xl md:text-5xl">{a.teamTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-4">
          {teamMembers.map((m) => (
            <div key={m.name} className="group/card rounded-3xl border border-border/70 bg-card p-5 transition-shadow hover:shadow-soft-lg">
              <div className="aspect-square rounded-2xl overflow-hidden border border-border/20 bg-muted/25 transition-transform duration-300 group-hover/card:-translate-y-1">
                {renderTeamAvatar(m.name)}
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{m.name}</h3>
              <p className="text-xs text-ink-muted">{locale === "ar" ? m.roleAr : m.roleEn}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-3xl border border-border/70 bg-cream p-8 text-center md:p-10">
          <h3 className="font-display text-3xl">{a.joinTitle}</h3>
          <p className="mt-2 text-sm text-ink-muted">{a.joinSub}</p>
          <Link to="/contact" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream">{a.joinCta}</Link>
        </div>
      </section>
    </SiteShell>
  );
}
