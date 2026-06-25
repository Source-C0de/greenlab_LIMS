import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mockSpecifications,
  testMasterData,
  type TestParameterRow,
  type TestMaster,
} from "@/mock-data/specifications";
import { mockAnalysts } from "@/mock-data";
import { useAppContext } from "@/context/AppContext";
import {
  Beaker,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  UserCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Shape of a test once added to a sample. Mirrors the existing
// mockSamples tests shape so downstream code (TestTable, TestDrawer,
// ParameterTable) keeps working without changes.
export interface NewSampleTest {
  id: string;
  name: string;
  category: string;
  method: string;
  methodType?: string;
  testCode?: string;
  specificationId?: string;
  assignedTo: string | null;
  status: string;
  parameters: Array<{
    id: string;
    name: string;
    value: string;
    unit: string;
    min: number | string | null;
    max: number | string | null;
    target?: string | number | null;
    limitType: string;
    method?: string;
    methodReference?: string;
    status: string;
  }>;
}

interface AddTestToSampleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives an array of tests to be appended to the sample's tests. */
  onAdd: (tests: NewSampleTest[]) => void;
  /** Sample ID, used to compose unique test IDs. */
  sampleId: string;
}

const newParamId = () =>
  `P-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, "0")}`;

// Parse a TestMaster's parameterDetails JSON into the Parameter shape
// used by the sample test / ParameterTable.
function loadParametersFromMaster(test: TestMaster) {
  if (!test.parameterDetails) return [];
  try {
    const rows: TestParameterRow[] = JSON.parse(test.parameterDetails);
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      id: newParamId(),
      name: r.name,
      value: "",
      unit: r.unit ?? "",
      min: r.limitType === "Range" || r.limitType === "Min Only"
        ? parseLimit(r.limitRange, "min")
        : null,
      max: r.limitType === "Range" || r.limitType === "Max Only"
        ? parseLimit(r.limitRange, "max")
        : null,
      target:
        r.limitType === "Exact Value" || r.limitType === "Pass / Fail" ||
        r.limitType === "Not Detected" || r.limitType === "Text"
          ? r.limitRange
          : null,
      limitType: r.limitType,
      method: r.method,
      methodReference: r.methodReference,
      status: "Pending",
    }));
  } catch {
    return [];
  }
}

function parseLimit(range: string, side: "min" | "max"): number | null {
  if (!range) return null;
  const m = range.match(/^(-?\d*\.?\d+)\s*[-–to]+\s*(-?\d*\.?\d+)$/i);
  if (m) {
    return side === "min" ? parseFloat(m[1]) : parseFloat(m[2]);
  }
  const single = parseFloat(range);
  return isNaN(single) ? null : single;
}

export function AddTestToSampleDialog({
  isOpen,
  onClose,
  onAdd,
  sampleId,
}: AddTestToSampleDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";

  // Step 1: spec
  const [specificationId, setSpecificationId] = useState<string>("");
  // Step 2: analyst
  const [analyst, setAnalyst] = useState<{ name: string; nameAr: string } | null>(
    null
  );
  // Step 3: tests
  const [search, setSearch] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isAnalystPickerOpen, setIsAnalystPickerOpen] = useState(false);

  // Reset state every time the dialog re-opens.
  useEffect(() => {
    if (isOpen) {
      setSpecificationId("");
      setAnalyst(null);
      setSearch("");
      setSelectedTestIds([]);
      setExpanded({});
      setIsAnalystPickerOpen(false);
    }
  }, [isOpen]);

  // Filtered test list based on the chosen spec.
  // - If a spec is chosen, show all tests but with their spec badge so the
  //   user can verify they match.
  // - The `match` flag tells us if this test belongs to the chosen spec;
  //   the user can still pick any test, but a warning is shown.
  const filteredTests = useMemo(() => {
    const q = search.toLowerCase().trim();
    return testMasterData
      .filter((t) => {
        if (!q) return true;
        return (
          t.testName.toLowerCase().includes(q) ||
          t.testCode.toLowerCase().includes(q) ||
          t.testParameter.toLowerCase().includes(q) ||
          t.methodType.toLowerCase().includes(q)
        );
      })
      .map((t) => ({
        ...t,
        matchesSpec: !specificationId || t.specificationId === specificationId,
      }));
  }, [search, specificationId]);

  const toggleTest = (id: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!specificationId) {
      toast.error(
        isRtl ? "يرجى اختيار المواصفة أولاً" : "Please choose a specification first"
      );
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error(isRtl ? "يرجى اختيار اختبار واحد على الأقل" : "Please select at least one test");
      return;
    }
    if (!analyst) {
      toast.error(isRtl ? "يرجى تعيين محلل" : "Please assign an analyst");
      return;
    }

    const newTests: NewSampleTest[] = selectedTestIds.map((id) => {
      const master = testMasterData.find((t) => t.id === id)!;
      return {
        // Sample-test IDs are unique per sample, prefix with the sample id.
        id: `${sampleId}-T-${id}-${Math.floor(Math.random() * 1000)
          .toString(36)
          .padStart(2, "0")}`,
        name: master.testName,
        category: master.methodType?.includes("Micro")
          ? "Microbiology"
          : master.methodType?.includes("Electro") ||
            master.methodType?.includes("Titration") ||
            master.methodType?.includes("Gravimetric")
          ? "Chemical"
          : "Physical",
        method: master.methodReference || master.methodType,
        methodType: master.methodType,
        testCode: master.testCode,
        specificationId,
        assignedTo: analyst.name,
        status: "Pending",
        parameters: loadParametersFromMaster(master),
      };
    });

    onAdd(newTests);
    toast.success(
      isRtl
        ? `تم إضافة ${newTests.length} اختبار`
        : `${newTests.length} test${newTests.length > 1 ? "s" : ""} added`
    );
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-primary" />
              {isRtl ? "إضافة اختبار" : "Add Test"}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? "اختر المواصفة والمحلل، ثم اختر الاختبارات التي تريد إضافتها إلى هذه العينة."
                : "Choose a specification and an analyst, then pick the tests to add to this sample."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 flex-shrink-0">
            {/* Step 1: Specification */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                {isRtl ? "المواصفة" : "Specification"}
                <span className="text-destructive">*</span>
              </Label>
              <Select value={specificationId} onValueChange={setSpecificationId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isRtl ? "اختر المواصفة..." : "Select a specification..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {mockSpecifications.map((spec) => (
                    <SelectItem key={spec.id} value={spec.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{spec.code}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{spec.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({spec.category})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Analyst */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                {isRtl ? "المحلل" : "Analyst"}
                <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                className="justify-start font-normal"
                onClick={() => setIsAnalystPickerOpen(true)}
              >
                {analyst ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                      {analyst.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">
                      {isRtl ? analyst.nameAr : analyst.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalyst(null);
                      }}
                      className="ms-2 text-muted-foreground hover:text-destructive rounded"
                      title={isRtl ? "إزالة" : "Remove"}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {isRtl ? "اختر المحلل..." : "Pick an analyst..."}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Step 3: Test list */}
          <div className="grid gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <Label>
                {isRtl ? "قائمة الاختبارات" : "Test List"}
                {selectedTestIds.length > 0 && (
                  <span className="ms-2 text-[10px] text-muted-foreground">
                    ({selectedTestIds.length} {isRtl ? "محدد" : "selected"})
                  </span>
                )}
              </Label>
              <div className="relative w-56">
                <Search
                  className={`absolute h-3.5 w-3.5 text-muted-foreground top-1/2 -translate-y-1/2 ${
                    isRtl ? "right-2.5" : "left-2.5"
                  }`}
                />
                <Input
                  placeholder={
                    isRtl ? "البحث في الاختبارات..." : "Search tests..."
                  }
                  className={`h-8 ${isRtl ? "pr-8" : "pl-8"}`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[260px] border rounded-md">
              <div className="divide-y">
                {filteredTests.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {isRtl ? "لا توجد اختبارات" : "No tests found"}
                  </div>
                ) : (
                  filteredTests.map((t) => {
                    const checked = selectedTestIds.includes(t.id);
                    const isOpen = expanded[t.id];
                    const spec = t.specificationId
                      ? mockSpecifications.find((s) => s.id === t.specificationId)
                      : undefined;
                    const params = isOpen ? loadParametersFromMaster(t) : [];
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "px-3 py-2",
                          checked && "bg-primary/5",
                          !t.matchesSpec && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleTest(t.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {t.testName}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {t.testCode}
                              </span>
                              {spec ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono gap-1"
                                >
                                  <BookOpen className="h-2.5 w-2.5" />
                                  {spec.code}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px]"
                                >
                                  {isRtl ? "بدون مواصفة" : "No spec"}
                                </Badge>
                              )}
                              {!t.matchesSpec && specificationId && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] text-amber-600 border-amber-200 bg-amber-50"
                                >
                                  {isRtl ? "مواصفة مختلفة" : "Different spec"}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {t.testParameter} · {t.methodType} · {t.sampleType}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                            }
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            <span className="ms-1 text-[10px]">
                              {isRtl ? "المعلمات" : "Parameters"}
                              {params.length > 0 && ` (${params.length})`}
                            </span>
                          </Button>
                        </div>
                        {isOpen && (
                          <div className="mt-2 ms-7 p-2 border rounded-md bg-muted/30">
                            {params.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic text-center py-2">
                                {isRtl
                                  ? "لا توجد معلمات لهذا الاختبار"
                                  : "No parameters defined for this test"}
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {params.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-background"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-medium">{p.name}</span>
                                      {p.unit && (
                                        <span className="text-muted-foreground font-mono">
                                          ({p.unit})
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground font-mono shrink-0">
                                      {p.limitType === "Pass / Fail" ||
                                      p.limitType === "Not Detected" ||
                                      p.limitType === "Text" ? (
                                        <span>{String(p.target ?? p.limitType)}</span>
                                      ) : p.min !== null || p.max !== null ? (
                                        <span>
                                          {p.min !== null && p.max !== null
                                            ? `${p.min} - ${p.max}`
                                            : p.min !== null
                                            ? `≥ ${p.min}`
                                            : `≤ ${p.max}`}
                                        </span>
                                      ) : (
                                        <span>—</span>
                                      )}
                                      <Badge
                                        variant="secondary"
                                        className="text-[9px] h-4"
                                      >
                                        {p.limitType}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!specificationId || !analyst || selectedTestIds.length === 0}
            >
              <Check className="mr-2 h-4 w-4" />
              {isRtl
                ? `إضافة ${selectedTestIds.length || ""} اختبار`.trim()
                : `Add ${selectedTestIds.length || ""} Test${selectedTestIds.length === 1 ? "" : "s"}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reuse the existing analyst picker */}
      <Dialog
        open={isAnalystPickerOpen}
        onOpenChange={(o) => !o && setIsAnalystPickerOpen(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isRtl ? "اختر المحلل" : "Pick Analyst"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {mockAnalysts.map((a) => {
                const selected = analyst?.name === a.name;
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted transition-colors",
                      selected && "bg-primary/5 border border-primary/20"
                    )}
                    onClick={() => {
                      setAnalyst({ name: a.name, nameAr: a.nameAr });
                      setIsAnalystPickerOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isRtl ? a.nameAr : a.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.specialization}
                        </p>
                      </div>
                    </div>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAnalystPickerOpen(false)}
            >
              {isRtl ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
