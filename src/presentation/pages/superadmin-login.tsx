import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/presentation/providers/AuthContext";
import { buildLoginPayload } from "@/infrastructure/api/auth";
import { ApiError } from "@/infrastructure/api/api";

export default function SuperadminLogin() {
  const [, setLocation] = useLocation();
  const { superadminLogin: submitLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Goes through the `superadminAuth` port, NOT the raw HTTP helper.
      // The port persists the token and publishes the session; the
      // AuthContext subscription mirrors that into React state. See the
      // superadmin adapter's header for why the raw helper was wrong.
      await submitLogin(buildLoginPayload(email, password));
      setLocation("/admin");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (err instanceof TypeError) {
        setError(
          "Unable to reach the server. Check that the backend is running and that the dev proxy points at it.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Unable to reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden md:flex flex-1 flex-col justify-center items-center bg-sidebar-primary text-sidebar-primary-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        <div className="relative z-10 max-w-md text-center">
          {/*
            The logo artwork is brand-blue (#056db2), so on the brand-blue
            panel it would be invisible (1.01:1 contrast). `brightness(0)
            invert(1)` maps every pixel to pure white, which reads clearly
            against the panel. The filter is applied HERE only — the same
            asset stays blue-on-white in the quotation preview.
          */}
          <img
            src="/images/GL LOGO_Business Card 1.svg"
            alt="GreenLab"
            className="h-20 w-auto mx-auto mb-8 object-contain logo-invert"
          />
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Platform <span className="font-light">Administration</span>
          </h1>
          <p className="text-lg opacity-90 mb-8 leading-relaxed">
            Restricted access. Authorized superadmins manage tenants, pricing, feature flags, and menu permissions for the entire GreenLabLIMS KSA platform.
          </p>
          <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm text-start text-sm">
            <p className="opacity-80 leading-relaxed">
              Authorized personnel only. All actions are logged and audited.
              Use your platform-issued credentials to continue.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            {/* Mobile logo sits on the white side — keep the artwork blue (no filter). */}
            <div className="md:hidden flex justify-center mb-6">
              <img
                src="/images/GL LOGO_Business Card 1.svg"
                alt="GreenLab"
                className="h-12 w-auto object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Superadmin Sign In</h2>
            <p className="text-muted-foreground mt-2">
              Authorized personnel only. All actions are logged.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="superadmin-email">Email</Label>
                <Input
                  id="superadmin-email"
                  type="email"
                  placeholder="superadmin@greenlablims.sa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="superadmin-password">Password</Label>
                <Input
                  id="superadmin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  autoComplete="current-password"
                  required
                />
              </div>
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

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={submitting}
            >
              {submitting ? "Verifying…" : "Sign In as Superadmin"}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to regular login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}