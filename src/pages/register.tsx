import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, AlertCircle, CheckCircle2 } from "lucide-react";
import { requestRegister, type RegisterRequest } from "@/lib/auth";
import { ApiError } from "@/lib/api";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  labName: string;
  labNameAr: string;
  crNumber: string;
  phone: string;
  message: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  labName: "",
  labNameAr: "",
  crNumber: "",
  phone: "",
  message: "",
};

export default function Register() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body: RegisterRequest = {
      labName: form.labName.trim(),
      labNameAr: form.labNameAr.trim() || undefined,
      contactName: `${form.firstName} ${form.lastName}`.trim(),
      contactEmail: form.email.trim(),
      contactPhone: form.phone.trim() || undefined,
      message: form.crNumber
        ? `CR: ${form.crNumber.trim()}${form.message ? `\n\n${form.message.trim()}` : ""}`
        : form.message.trim() || undefined,
    };

    try {
      await requestRegister(body);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("A request with this email already exists.");
      } else if (err instanceof ApiError && err.status === 400) {
        setError("Please check the form fields and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to submit your request.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-6 bg-background">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">Request Access</h2>
          <p className="text-muted-foreground mt-2">Register your laboratory for GreenLabLIMS KSA</p>
        </div>

        {submitted ? (
          <div className="bg-card p-8 rounded-xl border shadow-sm space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Request submitted</h3>
            <p className="text-muted-foreground text-sm">
              An administrator will review your request and reach out via the email you provided.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-6 bg-card p-8 rounded-xl border shadow-sm" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" required value={form.firstName} onChange={update("firstName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" required value={form.lastName} onChange={update("lastName")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={update("email")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="labName">Laboratory/Company Name (EN)</Label>
                <Input id="labName" required value={form.labName} onChange={update("labName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="labNameAr">Laboratory/Company Name (AR)</Label>
                <Input id="labNameAr" dir="rtl" value={form.labNameAr} onChange={update("labNameAr")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crNumber">CR Number (Optional)</Label>
              <Input id="crNumber" value={form.crNumber} onChange={update("crNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Notes (Optional)</Label>
              <Input id="message" value={form.message} onChange={update("message")} />
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
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
