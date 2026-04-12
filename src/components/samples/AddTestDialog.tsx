import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sampleTypes } from "@/mock-data";
import { useAppContext } from "@/context/AppContext";
import { Beaker, Search, Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface AddTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (testName: string, category: string) => void;
  sampleType: string;
}

export function AddTestDialog({ isOpen, onClose, onAdd, sampleType }: AddTestDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [search, setSearch] = useState("");

  // Get tests for this sample type or all if not found
  const typeData = sampleTypes.find(t => t.type === sampleType) || sampleTypes[0];
  const availableTests = typeData.tests.filter(t => 
    t.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isRtl ? "إضافة اختبار جديد" : "Add New Test"}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-muted/50 p-3 rounded-md mb-2">
            <p className="text-xs uppercase font-bold text-muted-foreground mb-1">
              {isRtl ? "نوع العينة" : "Sample Matrix"}
            </p>
            <p className="text-sm font-medium">{sampleType}</p>
          </div>

          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRtl ? 'right-3 left-auto' : ''}`} />
            <Input 
              placeholder={isRtl ? "البحث عن اختبار..." : "Search tests..."} 
              className={isRtl ? "pr-9" : "pl-9"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[250px] border rounded-md p-2">
            <div className="space-y-1">
              {availableTests.map((testName) => (
                <div 
                  key={testName}
                  className="flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted transition-colors border border-transparent hover:border-border"
                  onClick={() => onAdd(testName, sampleType)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <Beaker className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{testName}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {availableTests.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {isRtl ? "لا يوجد نتائج" : "No matching tests"}
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
