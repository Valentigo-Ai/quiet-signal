// ---------------------------------------------------------------------------
// Human-readable messages for Supabase auth failures.
//
// Why this exists: the password reset flow is two server calls in a row
// (verifyOtp, then updateUser). Before this, both were caught by one try/catch
// in ResetPasswordScreen, so a failure in the *second* call produced
// "Couldn't reset your password - Something went wrong", even though the first
// had already succeeded and signed the person in. Observed 2026-07-28: the
// database showed last_sign_in_at set at the moment of the "failure", and the
// app had already routed them into onboarding behind the error dialog. Telling
// someone their reset failed while simultaneously logging them in is the worst
// of both - they don't know which password now works.
//
// So: AuthContext tags reset failures with the stage they happened at, and
// these helpers turn the stage plus Supabase's error code into copy that says
// what is actually true.
// ---------------------------------------------------------------------------

/** Which half of confirmPasswordReset failed. */
export type PasswordResetStage = "verify" | "update";

export type AlertCopy = { title: string; body: string };

/**
 * Wraps a Supabase AuthError so the screen can tell "your code was wrong"
 * apart from "your code was fine but the new password was rejected".
 */
export class PasswordResetError extends Error {
  readonly stage: PasswordResetStage;
  readonly code?: string;
  readonly status?: number;

  constructor(stage: PasswordResetStage, cause: unknown) {
    const c = cause as { message?: string; code?: string; status?: number } | undefined;
    super(c?.message ?? "Password reset failed");
    this.name = "PasswordResetError";
    this.stage = stage;
    this.code = c?.code;
    this.status = c?.status;
  }
}

function fields(e: unknown): { code: string; status?: number; message: string } {
  const c = e as { message?: string; code?: string; status?: number } | undefined;
  return {
    code: String(c?.code ?? "").toLowerCase(),
    status: c?.status,
    message: String(c?.message ?? e ?? "").toLowerCase(),
  };
}

/**
 * True when Supabase refused because we asked too soon. Recovery emails are
 * rate limited to one per 60 seconds by default, and a second tap of "Send" or
 * "Resend" inside that window returns 429 - even though the first email is
 * already on its way. Treating that as an error tells people the opposite of
 * what happened.
 */
export function isRateLimited(e: unknown): boolean {
  const { code, status, message } = fields(e);
  return (
    status === 429 ||
    code.includes("rate_limit") ||
    message.includes("rate limit") ||
    message.includes("for security purposes") || // GoTrue's 60s wording
    message.includes("only request this after")
  );
}

/** Copy for a failure to send (or resend) the recovery code. */
export function describeRecoverySendError(e: unknown): AlertCopy {
  if (isRateLimited(e)) {
    return {
      title: "Your code is already on its way",
      body: "We sent one moments ago - check your inbox, and your spam folder. You can ask for another in a minute.",
    };
  }
  return {
    title: "Couldn't send the code",
    body: "Something went wrong sending your reset code. Check your connection and try again.",
  };
}

/** Copy for a failure inside confirmPasswordReset, specific to the stage. */
export function describePasswordResetError(e: unknown): AlertCopy {
  const stage: PasswordResetStage = e instanceof PasswordResetError ? e.stage : "verify";
  const { code, message } = fields(e);

  if (stage === "verify") {
    if (isRateLimited(e)) {
      return {
        title: "Too many tries",
        body: "Wait a minute, then enter the code again. Your code is still valid.",
      };
    }
    if (
      code.includes("otp_expired") ||
      code.includes("otp_disabled") ||
      message.includes("expired") ||
      message.includes("invalid") ||
      message.includes("token")
    ) {
      return {
        title: "That code didn't work",
        body: 'It may be wrong or expired. Codes last a short time - tap "Resend code" to get a fresh one.',
      };
    }
    return {
      title: "Couldn't check your code",
      body: "Something went wrong. Check your connection and try again.",
    };
  }

  // stage === "update": the code was accepted, so they ARE signed in now. Every
  // message below has to make that clear, or they'll assume they're locked out.
  if (code.includes("same_password") || message.includes("should be different")) {
    return {
      title: "That's already your password",
      body: "You're signed in, so nothing more to do. If you meant to change it, start the reset again and pick a password you haven't used here before.",
    };
  }
  if (code.includes("weak_password") || message.includes("password should be")) {
    return {
      title: "Password not strong enough",
      body: "You're signed in, but your password hasn't changed - your old one still works. Start the reset again and choose something longer.",
    };
  }
  if (isRateLimited(e)) {
    return {
      title: "Password not changed yet",
      body: "You're signed in, but we couldn't save the new password just now. Your old one still works. Try the reset again in a minute.",
    };
  }
  return {
    title: "Password not changed",
    body: "You're signed in, but saving the new password didn't work - your old one still works. Check your connection and try the reset again.",
  };
}
