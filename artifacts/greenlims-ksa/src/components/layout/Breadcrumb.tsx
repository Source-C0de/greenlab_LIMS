import { useLocation, Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export function Breadcrumb() {
  const [location] = useLocation();
  const { language } = useAppContext();
  
  const paths = location.split("/").filter(Boolean);
  
  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4">
      <Link href="/dashboard" className="hover:text-primary transition-colors">
        {language === "ar" ? "الرئيسية" : "Home"}
      </Link>
      {paths.map((path, index) => {
        const isLast = index === paths.length - 1;
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        
        // Basic formatting for breadcrumbs
        const formattedPath = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1" />
            {isLast ? (
              <span className="font-medium text-foreground">{formattedPath}</span>
            ) : (
              <Link href={href} className="hover:text-primary transition-colors">
                {formattedPath}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
