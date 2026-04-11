import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical } from "lucide-react";

export default function Register() {
  return (
    <div className="min-h-screen w-full flex justify-center items-center p-6 bg-background">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">Request Access</h2>
          <p className="text-muted-foreground mt-2">Register your laboratory for GreenLIMS KSA</p>
        </div>

        <form className="space-y-6 bg-card p-8 rounded-xl border shadow-sm" onSubmit={(e) => { e.preventDefault(); }}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input required />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Work Email</Label>
            <Input type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Laboratory/Company Name</Label>
            <Input required />
          </div>
          <div className="space-y-2">
            <Label>CR Number (Optional)</Label>
            <Input />
          </div>
          <Button type="submit" className="w-full h-11 text-base font-medium mt-4">
            Submit Request
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
