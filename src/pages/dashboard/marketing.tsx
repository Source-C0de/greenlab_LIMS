import { Link } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import MarketingReports from "@/components/dashboard/MarketingReports";

/**
 * Dedicated full-page module for Marketing Reports.
 *
 * The actual filters / table / exports live in
 * `src/components/dashboard/MarketingReports.tsx`. This page wraps that body
 * with a header (title, back link, breadcrumb) so it can stand on its own
 * instead of being rendered at the bottom of the main Dashboard.
 */
export default function MarketingReportsPage() {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className={`-ml-2 mb-1 text-muted-foreground ${isRtl ? "flex-row-reverse" : ""}`}
            >
              {isRtl ? (
                <ArrowRight className="ml-2 h-4 w-4" />
              ) : (
                <ArrowLeft className="mr-2 h-4 w-4" />
              )}
              {isRtl ? "العودة إلى لوحة القيادة" : "Back to Dashboard"}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {isRtl ? "تقارير التسويق" : "Marketing Reports"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRtl
              ? "إدارة وإنشاء تقارير التسويق"
              : "Manage & generate marketing reports"}
          </p>
        </div>
      </div>

      <MarketingReports />
    </div>
  );
}
