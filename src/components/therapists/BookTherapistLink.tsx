import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type BookTarget = {
  therapistId: string;
  slotId?: string;
};

type Props = Omit<ComponentProps<typeof Link>, "to" | "params" | "search"> & BookTarget;

function bookPath({ therapistId, slotId }: BookTarget): string {
  const base = `/book/${therapistId}`;
  if (slotId) return `${base}?slotId=${encodeURIComponent(slotId)}`;
  return base;
}

/**
 * Navigates to booking when signed in; otherwise login with return URL.
 */
export function BookTherapistLink({
  therapistId,
  slotId,
  className,
  children,
  onClick,
  ...rest
}: Props) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const destination = bookPath({ therapistId, slotId });

  if (!isFirebaseConfigured) {
    return (
      <Link
        to="/book/$therapistId"
        params={{ therapistId }}
        search={slotId ? { slotId } : {}}
        className={className}
        onClick={onClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  if (!loading && user) {
    return (
      <Link
        to="/book/$therapistId"
        params={{ therapistId }}
        search={slotId ? { slotId } : {}}
        className={className}
        onClick={onClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/auth/login"
      search={{ redirect: destination }}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && !loading && !user) {
          try {
            sessionStorage.setItem("thera_post_login_redirect", destination);
          } catch {
            /* ignore */
          }
        }
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Button variant for non-Link contexts */
export function goToBookOrLogin(
  nav: ReturnType<typeof useNavigate>,
  user: { uid: string } | null | undefined,
  target: BookTarget,
) {
  const destination = bookPath(target);
  if (user) {
    void nav({
      to: "/book/$therapistId",
      params: { therapistId: target.therapistId },
      search: target.slotId ? { slotId: target.slotId } : {},
    });
    return;
  }
  try {
    sessionStorage.setItem("thera_post_login_redirect", destination);
  } catch {
    /* ignore */
  }
  void nav({ to: "/auth/login", search: { redirect: destination } });
}
