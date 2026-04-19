import * as React from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  confirmPasswordReset,
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "./firebase";
import { registerFcm } from "@/lib/notifications/fcm";

function readPreferredLanguage(): "en" | "ar" {
  if (typeof window === "undefined") return "en";
  try {
    const ls = window.localStorage.getItem("thera.locale");
    if (ls === "ar" || ls === "en") return ls;
  } catch { /* ignore */ }
  const nav = typeof navigator !== "undefined" ? navigator.language?.toLowerCase() ?? "" : "";
  if (nav.startsWith("ar")) return "ar";
  return "en";
}

export type Role = "adult" | "parent" | "teen" | "therapist" | "admin";

export type Profile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role | null;
  language: "en" | "ar";
  createdAt?: unknown;
  xp?: number;
  level?: number;
  streak?: number;
  lastCheckIn?: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  claims: Record<string, unknown> | null;
  effectiveRole: Role | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string, continueUrl?: string) => Promise<void>;
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  refreshClaims: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [claims, setClaims] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState<boolean>(isFirebaseConfigured);

  // Auth state (profile from Firestore)
  React.useEffect(() => {
    if (!isFirebaseConfigured || !auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && db) {
        const ref = doc(db, "users", u.uid);
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setProfile(snap.data() as Profile);
          } else {
            const newProfile: Profile = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              role: null,
              language: readPreferredLanguage(),
              xp: 0,
              level: 1,
              streak: 0,
              lastCheckIn: null,
              createdAt: serverTimestamp(),
            };
            await setDoc(ref, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.warn("[auth] profile read failed", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      if (u) { void registerFcm(u); }
    });
    return unsub;
  }, []);

  // Token / custom claims
  React.useEffect(() => {
    if (!isFirebaseConfigured || !auth) return;
    const unsub = onIdTokenChanged(auth, async (u) => {
      if (!u) { setClaims(null); return; }
      try {
        const res = await u.getIdTokenResult();
        setClaims(res.claims as Record<string, unknown>);
      } catch {
        setClaims(null);
      }
    });
    return unsub;
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not configured");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = React.useCallback(async (email: string, password: string, name: string) => {
    if (!auth) throw new Error("Firebase not configured");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    try { await sendEmailVerification(cred.user); } catch { /* ignore */ }
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    if (!auth) throw new Error("Firebase not configured");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const resetPassword = React.useCallback(async (email: string, continueUrl?: string) => {
    if (!auth) throw new Error("Firebase not configured");
    const actionSettings = continueUrl ? { url: continueUrl } : undefined;
    await sendPasswordResetEmail(auth, email, actionSettings);
  }, []);

  const confirmReset = React.useCallback(async (oobCode: string, newPassword: string) => {
    if (!auth) throw new Error("Firebase not configured");
    await confirmPasswordReset(auth, oobCode, newPassword);
  }, []);

  const changePassword = React.useCallback(async (currentPassword: string, newPassword: string) => {
    if (!auth?.currentUser) throw new Error("Not signed in");
    const user = auth.currentUser;
    if (!user.email) throw new Error("No email on account");
    // Re-authenticate before sensitive operation
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
  }, []);

  const setRole = React.useCallback(async (role: Role) => {
    if (!user || !db) throw new Error("Not signed in");
    // Admin role must be set via a privileged server action — never from the
    // client.
    if (role === "admin") throw new Error("Admin role must be granted by platform staff.");
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { role }, { merge: true });
    setProfile((p) => (p ? { ...p, role } : p));
  }, [user]);

  const refreshClaims = React.useCallback(async () => {
    if (!auth?.currentUser) return;
    try {
      const res = await auth.currentUser.getIdTokenResult(true);
      setClaims(res.claims as Record<string, unknown>);
    } catch { /* ignore */ }
  }, []);

  const logout = React.useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  const effectiveRole: Role | null = React.useMemo(() => {
    const claimRole = claims?.role as Role | undefined;
    return (claimRole ?? profile?.role) ?? null;
  }, [claims, profile]);

  const value = React.useMemo<AuthContextValue>(() => ({
    user, profile, claims, effectiveRole,
    loading, configured: isFirebaseConfigured,
    signIn, signUp, signInWithGoogle,
    resetPassword, confirmReset, changePassword,
    setRole, refreshClaims, logout,
  }), [user, profile, claims, effectiveRole, loading, signIn, signUp, signInWithGoogle, resetPassword, confirmReset, changePassword, setRole, refreshClaims, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Client-side route gate. Redirects to /auth/login (or /auth/role, /auth/verify-email)
 * when preconditions are not met. Returns true if access is allowed.
 */
export function useRouteGate(
  opts: {
    requireAuth?: boolean;
    requireVerified?: boolean;
    requireRole?: Role | Role[];
  } = {},
) {
  const { user, effectiveRole, loading, configured } = useAuth();
  const [redirectTo, setRedirectTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!configured) return; // demo mode — don't redirect
    if (loading) return;
    if (opts.requireAuth && !user) { setRedirectTo("/auth/login"); return; }
    if (opts.requireVerified && user && !user.emailVerified) {
      setRedirectTo("/auth/verify-email"); return;
    }
    if (opts.requireRole && user) {
      const roles = Array.isArray(opts.requireRole) ? opts.requireRole : [opts.requireRole];
      if (!effectiveRole) { setRedirectTo("/auth/role"); return; }
      if (!roles.includes(effectiveRole)) { setRedirectTo("/"); return; }
    }
    setRedirectTo(null);
  }, [configured, loading, user, effectiveRole, opts.requireAuth, opts.requireVerified, opts.requireRole]);

  return {
    ready: !loading,
    allowed: redirectTo === null,
    redirectTo,
  };
}
