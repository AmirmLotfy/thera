import type { TherapistDoc, AvailabilitySlot } from "@/lib/types";

/**
 * Seed data used when Firebase is not configured. Each object carries a
 * deterministic id so /therapists/$id always resolves. Prices are expressed
 * in minor units (piastres for EGP, cents for USD).
 */
export const DEMO_THERAPISTS: TherapistDoc[] = [
  {
    id: "layla-haddad",
    uid: "demo-layla",
    displayName: "Dr. Layla Haddad",
    title: "Clinical Psychologist · CBT",
    bio: "I help adults and teens move through anxiety, life transitions, and relationship stress using cognitive-behavioural therapy and compassion-focused therapy. My sessions are warm, structured, and bilingual — we'll work in whatever language feels easier on the day.",
    specialties: ["anxiety", "relationships", "self_esteem", "teens"],
    languages: ["en", "ar"],
    pricePerSession: 90_00,
    currency: "USD",
    format: "both",
    yearsExperience: 12,
    education: ["DClinPsy — King's College London (2014)", "MSc Cognitive Therapy — Oxford (2011)", "BSc Psychology — AUB (2009)"],
    certifications: ["BPS Registered", "BABCP Accredited"],
    approved: true,
    rating: 4.9,
    ratingCount: 124,
    sessionMinutes: 50,
    instapay: {
      link: "https://ipn.eg/S/thera.dr.layla",
      handle: "thera.dr.layla",
      recipientName: "Dr. Layla Haddad",
    },
    createdAt: new Date("2023-02-10"),
  },
  {
    id: "omar-elsayed",
    uid: "demo-omar",
    displayName: "Omar El-Sayed",
    title: "Family Counselor",
    bio: "Practical, steady, bilingual counselor supporting couples and parents through hard conversations. I work in plain language with measurable goals each session.",
    specialties: ["couples", "parenting", "relationships"],
    languages: ["ar", "en"],
    pricePerSession: 55_00,
    currency: "USD",
    format: "online",
    yearsExperience: 9,
    education: ["MA Counselling Psychology — Cairo University (2016)"],
    certifications: ["Gottman Level 2", "ICF-PCC Coach"],
    approved: true,
    rating: 4.8,
    ratingCount: 88,
    sessionMinutes: 60,
    createdAt: new Date("2023-04-22"),
  },
  {
    id: "sara-ibrahim",
    uid: "demo-sara",
    displayName: "Dr. Sara Ibrahim",
    title: "Child & Teen Psychologist",
    bio: "Play-based work with children 6–12, talk-based work with teens 13–17, and parent coaching as standard. Specialty in ADHD, anxiety, and school transitions.",
    specialties: ["children", "teens", "adhd", "anxiety"],
    languages: ["en", "ar"],
    pricePerSession: 75_00,
    currency: "USD",
    format: "in_person",
    yearsExperience: 11,
    education: ["PhD Child Psychology — Ain Shams (2015)"],
    certifications: ["BPS Assoc Fellow"],
    approved: true,
    rating: 4.95,
    ratingCount: 141,
    sessionMinutes: 50,
    createdAt: new Date("2022-10-05"),
  },
  {
    id: "yusuf-khan",
    uid: "demo-yusuf",
    displayName: "Yusuf Khan",
    title: "Trauma Therapist · EMDR",
    bio: "Trauma-focused work with a calm, grounded approach. Primarily EMDR and somatic practices. Sessions can stay in English or Arabic; I don't rush.",
    specialties: ["trauma", "anxiety", "grief"],
    languages: ["en"],
    pricePerSession: 68_00,
    currency: "USD",
    format: "online",
    yearsExperience: 7,
    education: ["MA Trauma Therapy — UCL (2018)"],
    certifications: ["EMDR Europe Accredited"],
    approved: true,
    rating: 4.85,
    ratingCount: 62,
    sessionMinutes: 50,
    createdAt: new Date("2023-07-19"),
  },
  {
    id: "mariam-ali",
    uid: "demo-mariam",
    displayName: "Dr. Mariam Ali",
    title: "Psychiatrist",
    bio: "Medication review, depression, bipolar, and complex anxiety. Collaborative, evidence-based, and direct. I'll hand you a clear treatment note after every session.",
    specialties: ["depression", "anxiety", "eating"],
    languages: ["ar", "en"],
    pricePerSession: 120_00,
    currency: "USD",
    format: "both",
    yearsExperience: 15,
    education: ["MD, Kasr Al Ainy (2010)", "MRCPsych UK (2016)"],
    certifications: ["Egyptian Medical Syndicate", "RCPsych Member"],
    approved: true,
    rating: 4.9,
    ratingCount: 201,
    sessionMinutes: 30,
    createdAt: new Date("2021-06-30"),
  },
  {
    id: "hana-rashid",
    uid: "demo-hana",
    displayName: "Hana Rashid",
    title: "Wellness Coach",
    bio: "Arabic-first coaching for burnout, work stress, and sleep. Practical tools, not theory. Expect homework you'll actually want to do.",
    specialties: ["work_stress", "sleep", "self_esteem"],
    languages: ["ar"],
    pricePerSession: 40_00,
    currency: "USD",
    format: "online",
    yearsExperience: 5,
    education: ["BA Psychology — AUC (2019)"],
    certifications: ["ICF-ACC Coach"],
    approved: true,
    rating: 4.7,
    ratingCount: 48,
    sessionMinutes: 50,
    createdAt: new Date("2024-01-12"),
  },
];

// Generate a week of demo slots for each therapist (weekdays 10, 13, 16, 19).
export function demoSlotsFor(therapistId: string): AvailabilitySlot[] {
  const out: AvailabilitySlot[] = [];
  const now = new Date();
  for (let day = 0; day < 14; day++) {
    const d = new Date(now);
    d.setDate(now.getDate() + day);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    for (const hour of [10, 13, 16, 19]) {
      const start = new Date(d); start.setHours(hour, 0, 0, 0);
      const end = new Date(start); end.setHours(hour + 1);
      if (start.getTime() <= now.getTime()) continue;
      out.push({
        id: `${therapistId}-${start.toISOString()}`,
        therapistId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        status: "open",
      });
    }
  }
  return out;
}
