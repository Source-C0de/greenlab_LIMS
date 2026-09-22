import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await forgotPassword(email.trim());
      setDone(true);
      // Forward the email so OTP page can pre-fill it.
      setTimeout(() => {
        const params = new URLSearchParams({ email: email.trim() });
        setLocation(`/otp-verify?${params.toString()}`);
      }, 800);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Please enter a valid email address.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to send the reset code.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">Reset Password</h2>
          <p className="text-muted-foreground mt-2">Enter your email and we'll send you a 6-digit OTP</p>
        </div>

        {done ? (
          <div className="rounded-lg border bg-card p-6 space-y-3 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              If that email is registered, a reset code has been sent. Redirecting to verification…
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@laboratory.sa"
                required
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={submitting}>
              {submitting ? "Sending…" : "Send Reset Code"}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
