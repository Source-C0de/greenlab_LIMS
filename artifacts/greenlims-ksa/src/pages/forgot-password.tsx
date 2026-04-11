import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation("/otp-verify");
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">Reset Password</h2>
          <p className="text-muted-foreground mt-2">Enter your email and we'll send you a 6-digit OTP</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="name@laboratory.sa" required className="h-11" />
          </div>
          <Button type="submit" className="w-full h-11 text-base font-medium">
            Send Reset Code
          </Button>
        </form>

        <div className="text-center">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
