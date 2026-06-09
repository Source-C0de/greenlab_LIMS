import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockSpecifications, Specification } from "@/mock-data";
import { useAppContext } from "@/context/AppContext";
import { Beaker, Search, Check, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface AddSpecificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (specification: Specification) => void;
  currentSpecId?: string | null;
}

export function AddSpecificationDialog({
  isOpen,
  onClose,
  onAdd,
  currentSpecId,
}: AddSpecificationDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [search, setSearch] = useState("");

  const filteredSpecs = mockSpecifications.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            {isRtl ? "إضافة مواصفة" : "Add Specification"}
          </DialogTitle>
          <DialogDescription>
            {isRtl
              ? "اختر مواصفة لربطها بهذه العينة. سيتم تحميل معايير القبول تلقائياً."
              : "Select a specification to link with this sample. Acceptance criteria will be loaded automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${
                isRtl ? "right-3 left-auto" : ""
              }`}
            />
            <Input
              placeholder={isRtl ? "البحث عن مواصفة..." : "Search specifications..."}
              className={isRtl ? "pr-9" : "pl-9"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {filteredSpecs.map((spec) => {
                const isCurrent = currentSpecId === spec.id;
                return (
                  <div
                    key={spec.id}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted transition-colors border border-transparent hover:border-border ${
                      isCurrent ? "bg-primary/5 border-primary/20" : ""
                    }`}
                    onClick={() => onAdd(spec)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{spec.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 font-mono">
                            {spec.code}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {spec.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {spec.parameters.length}{" "}
                            {isRtl ? "معلمة" : "params"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })}
              {filteredSpecs.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {isRtl ? "لا يوجد نتائج" : "No matching specifications"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
