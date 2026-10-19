import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FlaskConical, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAppContext, type Role } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { buildLoginPayload } from "@/lib/auth";
import { ApiError } from "@/lib/api";

/** Where each role lands after a successful login. */
const ROLE_REDIRECT: Record<Role, string> = {
  superadmin:   "/admin",
  admin:        "/dashboard",
  lab_manager:  "/dashboard",
  analyst:      "/dashboard",
  receptionist: "/samples/receiving",
  accountant:   "/accounting/dashboard",
  client:       "/client-portal",
};

// Bilingual label table (Style B per the bilingual-component skill).
type Label = { en: string; ar: string };
const LABELS = {
  brand: { en: "GreenLabLIMS", ar: "جرين لاب LIMS" } as Label,
  brandAccent: { en: "KSA", ar: "السعودية" } as Label,
  tagline: {
    en: "The premier enterprise Laboratory Information Management System for Saudi Arabia. Built for precision, compliance, and scale.",
    ar: "نظام إدارة معلومات المختبر المؤسسي الرائد في المملكة العربية السعودية. مصمم للدقة والامتثال والتوسع.",
  } as Label,
  zatca:    { en: "ZATCA Compliant",   ar: "متوافق مع هيئة الزكاة" } as Label,
  sfda:     { en: "SFDA Ready",        ar: "جاهز لـ SFDA" } as Label,
  iso:      { en: "ISO 17025",         ar: "آيزو 17025" } as Label,
  rtl:      { en: "Full RTL Support",  ar: "دعم كامل للعربية" } as Label,
  welcome:  { en: "Welcome back",      ar: "مرحبًا بعودتك" } as Label,
  subtitle: { en: "Sign in to your account to continue",
              ar: "سجّل الدخول إلى حسابك للمتابعة" } as Label,
  username: { en: "Username or Email", ar: "اسم المستخدم أو البريد" } as Label,
  password: { en: "Password",          ar: "كلمة المرور" } as Label,
  forgot:   { en: "Forgot password?",  ar: "هل نسيت كلمة المرور؟" } as Label,
  remember: { en: "Remember me for 30 days",
              ar: "تذكّرني لمدة 30 يومًا" } as Label,
  signIn:   { en: "Sign In",           ar: "تسجيل الدخول" } as Label,
  signing:  { en: "Signing in…",       ar: "جارٍ تسجيل الدخول…" } as Label,
  invalid:  { en: "Invalid username or password",
              ar: "اسم المستخدم أو كلمة المرور غير صحيحة" } as Label,
  network:  { en: "Unable to reach the server. Please try again.",
              ar: "تعذّر الوصول إلى الخادم. حاول مرة أخرى." } as Label,
  noAccount:{ en: "Don't have an account?",
              ar: "ليس لديك حساب؟" } as Label,
  request:  { en: "Request access",    ar: "طلب وصول" } as Label,
  superLink:{ en: "Superadmin login",  ar: "دخول المشرف العام" } as Label,
} as const;

export default function Login() {
  const [, setLocation] = useLocation();
  const { language } = useAppContext();
  const { login: submitLogin } = useAuth();
  const isRtl = language === "ar";
  const pick = (l: Label) => (isRtl ? l.ar : l.en);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<number | null>(null);

  const triggerShake = () => {
    if (shakeTimer.current !== null) {
      window.clearTimeout(shakeTimer.current);
    }
    // Toggle off → on so the CSS animation can replay on every failure.
    setShake(false);
    // Use a microtask so the class re-add is a separate render.
    window.setTimeout(() => {
      setShake(true);
      shakeTimer.current = window.setTimeout(() => setShake(false), 400);
    }, 0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);

    try {
      const user = await submitLogin(buildLoginPayload(username, password));
      setLocation(ROLE_REDIRECT[user.role] ?? "/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setLoginError(pick(LABELS.invalid));
        triggerShake();
      } else if (err instanceof ApiError) {
        // Backend replied with a non-401 status — surface the status + body.
        const detail =
          err.body && typeof err.body === "object" && "detail" in err.body
            ? String((err.body as { detail: unknown }).detail)
            : err.message;
        setLoginError(`${err.status} — ${detail}`);
        triggerShake();
      } else if (err instanceof TypeError) {
        // "Failed to fetch" — the browser could not open a network
        // connection. Show the actual message and the base URL so the user
        // can compare to the backend in DevTools. Handle both relative
        // (default "/api/v1", same-origin via Vite proxy) and absolute
        // (e.g. "http://localhost:8000") base URLs without double-prefixing.
        const base =
          (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
          "/api/v1";
        const fullUrl = /^https?:\/\//.test(base)
          ? `${base.replace(/\/$/, "")}/auth/login`
          : `${window.location.origin}${base}/auth/login`;
        setLoginError(
          `Network: ${err.message}. Tried ${fullUrl} — ` +
            `is the backend reachable? Check that the dev proxy (vite.config.ts → /api) ` +
            `points to the right host/port, and that no browser extension is blocking /api.`,
        );
        triggerShake();
      } else {
        setLoginError(err instanceof Error ? err.message : pick(LABELS.network));
        triggerShake();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left side — Branding (hidden on mobile) */}
      <div className="hidden md:flex flex-1 flex-col justify-center items-center bg-sidebar-primary text-sidebar-primary-foreground p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 max-w-md text-center">
          <FlaskConical className="h-20 w-20 mx-auto mb-8 opacity-90" />
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            {pick(LABELS.brand)} <span className="font-light">{pick(LABELS.brandAccent)}</span>
          </h1>
          <p className="text-lg opacity-80 mb-8 leading-relaxed">
            {pick(LABELS.tagline)}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
              {pick(LABELS.zatca)}
            </div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
              {pick(LABELS.sfda)}
            </div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
              {pick(LABELS.iso)}
            </div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">
              {pick(LABELS.rtl)}
            </div>
          </div>
        </div>
      </div>

      {/* Right side — Login form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center md:text-start">
            <div className="md:hidden flex justify-center mb-6 text-primary">
              <FlaskConical className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">{pick(LABELS.welcome)}</h2>
            <p className="text-muted-foreground mt-2">{pick(LABELS.subtitle)}</p>
          </div>

          <form
            onSubmit={handleLogin}
            className={`space-y-6 ${shake ? "animate-shake" : ""}`}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{pick(LABELS.username)}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{pick(LABELS.password)}</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {pick(LABELS.forgot)}
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pe-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? isRtl
                          ? "إخفاء كلمة المرور"
                          : "Hide password"
                        : isRtl
                        ? "إظهار كلمة المرور"
                        : "Show password"
                    }
                    title={
                      showPassword
                        ? isRtl
                          ? "إخفاء كلمة المرور"
                          : "Hide password"
                        : isRtl
                        ? "إظهار كلمة المرور"
                        : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 end-0 flex items-center justify-center w-10 text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-e-md"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="font-normal text-sm">
                {pick(LABELS.remember)}
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={submitting}
            >
              {submitting ? pick(LABELS.signing) : pick(LABELS.signIn)}
            </Button>

            {loginError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="whitespace-pre-line">{loginError}</span>
              </div>
            )}

            <TestBackendButton />
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {pick(LABELS.noAccount)}{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              {pick(LABELS.request)}
            </Link>
          </p>

          <p className="text-center">
            <Link
              href="/superadmin"
              className="text-xs font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ShieldCheck className="h-3 w-3" /> {pick(LABELS.superLink)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick connectivity test. Hits the same proxy the login form uses so the
 * user can see whether the backend is reachable before trying to sign in.
 */
function TestBackendButton() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [detail, setDetail] = useState<string>("");

  const run = async () => {
    setStatus("testing");
    setDetail("");
    const base =
      (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
      "/api/v1";
    const url = /^https?:\/\//.test(base)
      ? `${base.replace(/\/$/, "")}/auth/login`
      : `${window.location.origin}${base}/auth/login`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "include",
      });
      setStatus("ok");
      setDetail(
        isRtl
          ? `تم الاتصال — استجاب الخادم بـ ${res.status}`
          : `Reachable — server returned ${res.status}`,
      );
    } catch (err) {
      setStatus("fail");
      const msg = err instanceof Error ? err.message : String(err);
      setDetail(
        isRtl
          ? `فشل الاتصال بـ ${url}: ${msg}`
          : `Could not reach ${url}: ${msg}`,
      );
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={run}
        disabled={status === "testing"}
        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 disabled:opacity-50"
      >
        {status === "testing"
          ? isRtl
            ? "…جاري اختبار الاتصال"
            : "Testing connection…"
          : isRtl
          ? "اختبار الاتصال بالخادم"
          : "Test backend connection"}
      </button>
      {detail && (
        <p
          className={`text-xs ${
            status === "ok"
              ? "text-emerald-600"
              : status === "fail"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
