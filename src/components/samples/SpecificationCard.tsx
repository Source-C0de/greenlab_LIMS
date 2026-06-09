import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, FileText, Calendar, Hash } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Specification } from "@/mock-data/specifications";

interface SpecificationCardProps {
  specification: Specification | null;
  testCount?: number;
}

export function SpecificationCard({ specification, testCount }: SpecificationCardProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  if (!specification) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="py-8 flex flex-col items-center justify-center text-center">
          <Beaker className="h-10 w-10 text-muted-foreground mb-3 opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">
            {isRtl ? "لم يتم ربط مواصفة بهذه العينة" : "No specification linked to this sample"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRtl
              ? "انقر على \"إضافة مواصفة\" لربط واحدة وعرض معايير القبول"
              : "Click \"Add Specification\" to link one and view acceptance criteria"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {specification.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRtl ? "المواصفة المرتبطة" : "Linked Specification"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] h-5">
              <Hash className="w-3 h-3 mr-1" /> {specification.code}
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5">
              {specification.category}
            </Badge>
            {typeof testCount === "number" && (
              <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                {isRtl ? `${testCount} اختبار` : `${testCount} test${testCount === 1 ? "" : "s"}`}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span className="font-medium">{isRtl ? "الرمز:" : "Code:"}</span>
            <span className="text-foreground font-mono">{specification.code}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Beaker className="h-3.5 w-3.5" />
            <span className="font-medium">{isRtl ? "الفئة:" : "Category:"}</span>
            <span className="text-foreground">{specification.category}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="font-medium">{isRtl ? "تاريخ الإصدار:" : "Issued:"}</span>
            <span className="text-foreground">{specification.issuanceDate}</span>
          </div>
        </div>

        {specification.parameters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {isRtl ? "معايير القبول" : "Acceptance Criteria"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {specification.parameters.length}{" "}
                {isRtl ? "معلمة" : `parameter${specification.parameters.length === 1 ? "" : "s"}`}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {specification.parameters.map((p) => (
                <div
                  key={p.parameterId}
                  className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {p.method}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.mandatory && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-red-200 text-red-600 bg-red-50">
                        {isRtl ? "إلزامي" : "Required"}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-5 font-mono">
                      {p.limitType === "Range" && p.min !== null && p.max !== null
                        ? `${p.min} - ${p.max}`
                        : p.limitType === "Max Only" && p.max !== null
                        ? `≤ ${p.max}`
                        : p.limitType === "Min Only" && p.min !== null
                        ? `≥ ${p.min}`
                        : p.target !== null && p.target !== ""
                        ? `${p.target}`
                        : p.limitRange || p.limitType}
                      {p.unit ? ` ${p.unit}` : ""}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {specification.parameters.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isRtl
              ? "لا توجد معايير قبول محددة لهذه المواصفة"
              : "No acceptance criteria defined for this specification"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
