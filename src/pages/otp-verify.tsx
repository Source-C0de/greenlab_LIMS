import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FlaskConical, ArrowLeft, AlertCircle } from "lucide-react";
import { useAppContext, type Role } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { resendOtp, verifyOtp } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const ROLE_REDIRECT: Record<Role, string> = {
  superadmin:   "/admin",
  admin:        "/dashboard",
  lab_manager:  "/dashboard",
  analyst:      "/dashboard",
  receptionist: "/samples/receiving",
  accountant:   "/accounting/dashboard",
  client:       "/client-portal",
};

export default function OtpVerify() {
  const [, setLocation] = useLocation();
  const { language } = useAppContext();
  const { applyLoginResponse } = useAuth();
  const isRtl = language === "ar";

  // Email comes from the query string (?email=…). Falls back to manual entry below.
  const emailFromQuery = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("email") ?? "";
  }, []);
  const [email, setEmail] = useState(emailFromQuery);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const handleVerify = async () => {
    if (value.length !== 6) return;
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const response = await verifyOtp({ email: email.trim(), otp: value });
      const user = applyLoginResponse(response);
      setLocation(ROLE_REDIRECT[user.role] ?? "/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid or expired code. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Verification failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }
    setResending(true);
    setError(null);
    try {
      await resendOtp(email.trim());
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">
            {isRtl ? "أدخل رمز التحقق" : "Two-Step Verification"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {isRtl 
              ? "لقد أرسلنا رمز تحقق إلى بريدك الإلكتروني لضمان أمان حسابك." 
              : "We've sent a 6-digit security code to your registered email for enhanced security."}
          </p>
        </div>

        <div className="space-y-2 text-start">
          <Label htmlFor="otp-email">{isRtl ? "البريد الإلكتروني" : "Email"}</Label>
          <Input
            id="otp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
            disabled={!!emailFromQuery}
          />
        </div>

        <div className="flex justify-center py-4">
          <InputOTP maxLength={6} value={value} onChange={setValue}>
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="w-12 h-14 text-xl border-primary/20" />
              <InputOTPSlot index={1} className="w-12 h-14 text-xl border-primary/20" />
              <InputOTPSlot index={2} className="w-12 h-14 text-xl border-primary/20" />
              <InputOTPSlot index={3} className="w-12 h-14 text-xl border-primary/20" />
              <InputOTPSlot index={4} className="w-12 h-14 text-xl border-primary/20" />
              <InputOTPSlot index={5} className="w-12 h-14 text-xl border-primary/20" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resent && !error && (
          <div className="rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm text-center">
            {isRtl ? "أعدنا إرسال الرمز." : "A new code has been sent."}
          </div>
        )}

        <Button
          onClick={handleVerify}
          className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20"
          disabled={value.length !== 6 || submitting}
        >
          {submitting
            ? (isRtl ? "جارٍ التحقق…" : "Verifying…")
            : (isRtl ? "تحقق وتسجيل الدخول" : "Verify & Sign In")}
        </Button>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-medium text-primary hover:underline block w-full mb-4 disabled:opacity-60"
          >
            {resending
              ? (isRtl ? "جارٍ الإرسال…" : "Sending…")
              : (isRtl ? "إعادة إرسال الرمز" : "Didn't receive a code? Resend")}
          </button>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> {isRtl ? "العودة لتسجيل الدخول" : "Back to login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
