import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FlaskConical } from "lucide-react";
import { useAppContext, Role } from "@/context/AppContext";

export default function Login() {
  const [, setLocation] = useLocation();
  const { currentRole, setCurrentRole } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Normally authenticate here
    if (currentRole === "client") {
      setLocation("/otp-verify");
    } else {
      setLocation("/dashboard");
    }
  };

  const handleDemoLogin = (role: Role, roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("demo123");
    setCurrentRole(role);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden md:flex flex-1 flex-col justify-center items-center bg-sidebar-primary text-sidebar-primary-foreground p-12 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 max-w-md text-center">
          <FlaskConical className="h-20 w-20 mx-auto mb-8 opacity-90" />
          <h1 className="text-4xl font-bold mb-4 tracking-tight">GreenLabLIMS <span className="font-light">KSA</span></h1>
          <p className="text-lg opacity-80 mb-8 leading-relaxed">
            The premier enterprise Laboratory Information Management System for Saudi Arabia. Built for precision, compliance, and scale.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">ZATCA Compliant</div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">SFDA Ready</div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">ISO 17025</div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 backdrop-blur-sm">Full RTL Support</div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            <div className="md:hidden flex justify-center mb-6 text-primary">
              <FlaskConical className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
                <Input 
                  id="email" 
                  type="text" 
                  placeholder="admin@greenlablims.sa" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="font-normal text-sm">Remember me for 30 days</Label>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium">
              Sign In
            </Button>
          </form>

          <div className="mt-8 border-t pt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center">Quick Login (Demo Roles)</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("admin", "admin@greenlablims.sa")}>
                System Admin
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("lab_manager", "manager@greenlablims.sa")}>
                Lab Manager
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("analyst", "analyst@greenlablims.sa")}>
                Analyst
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("receptionist", "reception@greenlablims.sa")}>
                Receptionist
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("client", "client@company.sa")}>
                Client
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDemoLogin("accountant", "finance@greenlablims.sa")}>
                Accountant
              </Button>
            </div>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="font-medium text-primary hover:underline">Request access</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
