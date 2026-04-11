import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FlaskConical, ArrowLeft } from "lucide-react";

export default function OtpVerify() {
  const [, setLocation] = useLocation();
  const [value, setValue] = useState("");

  const handleVerify = () => {
    if (value.length === 6) {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">Enter OTP</h2>
          <p className="text-muted-foreground mt-2">We sent a verification code to your email.</p>
        </div>

        <div className="flex justify-center py-4">
          <InputOTP maxLength={6} value={value} onChange={setValue}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button onClick={handleVerify} className="w-full h-11 text-base font-medium" disabled={value.length !== 6}>
          Verify & Reset
        </Button>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
