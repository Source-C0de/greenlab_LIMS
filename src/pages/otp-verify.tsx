import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FlaskConical, ArrowLeft } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function OtpVerify() {
  const [, setLocation] = useLocation();
  const { currentRole, language } = useAppContext();
  const [value, setValue] = useState("");
  const isRtl = language === "ar";

  const handleVerify = () => {
    if (value.length === 6) {
      if (currentRole === "client") {
        setLocation("/client-portal");
      } else {
        setLocation("/dashboard");
      }
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

        <Button 
          onClick={handleVerify} 
          className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" 
          disabled={value.length !== 6}
        >
          {isRtl ? "تحقق وتسجيل الدخول" : "Verify & Sign In"}
        </Button>

        <div className="text-center mt-6">
          <button className="text-sm font-medium text-primary hover:underline block w-full mb-4">
            {isRtl ? "إعادة إرسال الرمز" : "Didn't receive a code? Resend"}
          </button>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> {isRtl ? "العودة لتسجيل الدخول" : "Back to login"}
          </Link>
        </div>
      </div>
    </div>
  );
}
