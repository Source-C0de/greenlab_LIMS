// =========================================================================
// TestCatalogPicker — search + multi-select list of TestMaster records.
// =========================================================================
// Reads from the testMasterData catalog, filters by sample type, renders a
// checkable list with a search box. The parent owns the selection state and
// persists via useWorkOrderTestsFromCatalog().syncFromCatalog.

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { testMasterData, type TestMaster } from "@/mock-data/specifications";
import { cn } from "@/lib/utils";

interface TestCatalogPickerProps {
  sampleType: string;
  /** Currently selected TestMaster ids. */
  selectedIds: string[];
  onChange: (next: string[]) => void;
  isRtl: boolean;
  disabled?: boolean;
  className?: string;
}

export function TestCatalogPicker({
  sampleType,
  selectedIds,
  onChange,
  isRtl,
  disabled = false,
  className,
}: TestCatalogPickerProps) {
  const [query, setQuery] = useState("");

  // Filter by sample type (case-insensitive) AND optional text query.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return testMasterData
      .filter((t) => !sampleType || t.sampleType.toLowerCase() === sampleType.toLowerCase())
      .filter((t) => {
        if (!q) return true;
        return (
          t.testName.toLowerCase().includes(q) ||
          t.testCode.toLowerCase().includes(q) ||
          t.testParameter.toLowerCase().includes(q) ||
          t.methodReference.toLowerCase().includes(q)
        );
      });
  }, [sampleType, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (m: TestMaster) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(m.id)) next.delete(m.id);
    else next.add(m.id);
    onChange([...next]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Search
          className={cn(
            "h-4 w-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            isRtl ? "right-2" : "left-2",
          )}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isRtl
              ? "ابحث في الاختبارات (الاسم، الكود، المرجع...)"
              : "Search tests (name, code, reference...)"
          }
          className={isRtl ? "pr-8" : "pl-8"}
          disabled={disabled}
        />
      </div>

      <div
        className={cn(
          "rounded-md border bg-card",
          disabled && "opacity-60 pointer-events-none",
        )}
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {isRtl
              ? "لا توجد اختبارات لهذا النوع من العينات"
              : "No tests found for this sample type."}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((m) => {
              const checked = selectedSet.has(m.id);
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40",
                    checked && "bg-primary/5",
                  )}
                  onClick={() => toggle(m)}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(m)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{m.testName}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {m.testCode}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.testParameter} • {m.methodType} • {m.methodReference}
                    </div>
                    {m.warehouseItems && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {isRtl ? "الكواشف: " : "Reagents: "}
                        {m.warehouseItems}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {isRtl
          ? `تم اختيار ${selectedIds.length} من ${filtered.length} اختبار`
          : `${selectedIds.length} of ${filtered.length} selected`}
      </div>
    </div>
  );
}