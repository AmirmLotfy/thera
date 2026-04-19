// Shared TypeScript types for Firestore documents.

export type Role = "adult" | "parent" | "teen" | "therapist" | "admin";
export type Locale = "en" | "ar";

export type Format = "online" | "in_person" | "both";
export type Specialty =
  | "anxiety" | "depression" | "relationships" | "trauma" | "children"
  | "teens" | "parenting" | "sleep" | "work_stress" | "self_esteem"
  | "grief" | "adhd" | "addictions" | "eating" | "couples" | "general";

export interface UserDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role | null;
  language: Locale;
  xp: number;
  level: number;
  streak: number;
  lastCheckIn: string | null;
  createdAt: unknown;
  fcmTokens?: string[];
  // teen-specific
  parentUid?: string | null;
}

export interface ParentDoc {
  uid: string;
  displayName: string | null;
  childrenIds: string[];
  createdAt: unknown;
}

export interface ChildDoc {
  id: string;
  parentUid: string;
  name: string;
  dob: string;           // YYYY-MM-DD
  pronouns?: string;
  notes?: string;
  createdAt: unknown;
}

export interface TherapistInstapay {
  link?: string;          // e.g. "https://ipn.eg/S/thera.dr.layla"
  handle?: string;        // e.g. "thera.dr.layla"
  recipientName?: string; // display name shown to patients
}

export interface TherapistDoc {
  id: string;
  uid: string;
  displayName: string;
  title?: string;
  photoUrl?: string;
  bio: string;
  specialties: Specialty[];
  languages: Locale[];
  pricePerSession: number;   // in minor units (e.g. piastres / cents)
  currency: "EGP" | "USD" | "SAR" | "AED";
  format: Format;
  yearsExperience?: number;
  education?: string[];
  certifications?: string[];
  approved: boolean;
  rating?: number;
  ratingCount?: number;
  sessionMinutes?: number;   // typical length (default 50)
  instapay?: TherapistInstapay;
  createdAt: unknown;
}

export interface TherapistApplication {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  specialty: Specialty;
  licenseNumber?: string;
  cvPath?: string;          // Storage path: applications/{uid}/cv.pdf
  linkedinUrl?: string;
  facebookUrl?: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  adminNote?: string;
  createdAt: unknown;
  reviewedAt?: unknown;
}

export interface AvailabilitySlot {
  id: string;
  therapistId: string;
  startsAt: string;          // ISO
  endsAt: string;
  status: "open" | "locked" | "booked";
}

export interface Booking {
  id: string;
  slotId: string;
  therapistId: string;
  patientUid: string;
  childId?: string | null;
  status: "pending_payment" | "awaiting_verification" | "confirmed" | "completed" | "cancelled" | "refunded";
  paymentId?: string | null;
  paymentProvider?: "polar" | "instapay" | "manual";
  amount: number;
  currency: "EGP" | "USD" | "SAR" | "AED";
  notes?: string;
  sessionId?: string | null;
  createdAt: unknown;
  updatedAt?: unknown;
}

export interface PaymentDoc {
  id: string;
  bookingId: string;
  uid: string;
  provider: "polar" | "instapay" | "manual";
  amount: number;
  currency: "EGP" | "USD" | "SAR" | "AED";
  status: "pending" | "paid" | "failed" | "refunded";
  providerSessionId?: string;   // polar checkout id
  providerOrderId?: string;     // polar order id
  proofPath?: string;           // storage path for instapay screenshot
  adminNote?: string;
  createdAt: unknown;
  paidAt?: unknown;
}

export interface SessionDoc {
  id: string;
  bookingId: string;
  therapistId: string;
  patientUid: string;
  startsAt: string;
  endsAt: string;
  roomUrl?: string;
  roomName?: string;
  status: "upcoming" | "live" | "ended" | "missed";
  createdAt: unknown;
}

export interface ReportDoc {
  id: string;
  sessionId: string;
  therapistId: string;
  patientUid: string;
  raw: string;
  summary?: string;       // bilingual plain-language summary
  summaryEn?: string;
  summaryAr?: string;
  recommendations?: string[];
  createdAt: unknown;
}

export interface MoodLog {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  score: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  note?: string;
  createdAt: unknown;
}

export interface Achievement {
  id: string;
  key: string;
  unlockedAt: unknown;
}

export interface NotificationDoc {
  id: string;
  uid: string;
  title: string;
  body: string;
  read: boolean;
  href?: string;
  kind?: "booking" | "report" | "approval" | "reminder" | "system";
  createdAt: unknown;
}

export interface AIConversation {
  id: string;
  uid: string;
  role: Role;
  title?: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  uid: string;
  role: "user" | "assistant";
  content: string;
  crisis?: boolean;
  createdAt: unknown;
}

export interface ArticleDoc {
  id: string;
  slug: string;
  published: boolean;
  authorName?: string;
  coverUrl?: string;
  categoryId?: string;
  translations: {
    en?: { title: string; excerpt: string; body: string };
    ar?: { title: string; excerpt: string; body: string };
  };
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CategoryDoc {
  id: string;
  slug: string;
  labelEn: string;
  labelAr: string;
  order: number;
}

export interface AdminLog {
  id: string;
  kind: "crisis_flag" | "therapist_approved" | "therapist_rejected" | "payment_verified" | "instapay.approved" | "instapay.rejected" | "refund" | "system";
  uid?: string;
  text?: string;
  payload?: Record<string, unknown>;
  at: unknown;
}

export interface SettingsDoc {
  id: string;             // "global"
  maintenance?: boolean;
  featuredTherapistIds?: string[];
  crisisHotlines?: Array<{ label: string; number: string; country: string }>;
}

export interface FcmTokenDoc {
  id: string;
  token: string;
  platform: "web" | "ios" | "android";
  createdAt: unknown;
}
