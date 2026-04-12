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
import { mockAnalysts } from "@/mock-data";
import { useAppContext } from "@/context/AppContext";
import { Search, UserCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface AssignAnalystDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (analyst: any) => void;
  currentAnalyst?: string | null;
}

export function AssignAnalystDialog({ isOpen, onClose, onAssign, currentAnalyst }: AssignAnalystDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [search, setSearch] = useState("");

  const filteredAnalysts = mockAnalysts.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.nameAr.includes(search)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isRtl ? "تعيين محلل" : "Assign Analyst"}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRtl ? 'right-3 left-auto' : ''}`} />
            <Input 
              placeholder={isRtl ? "البحث عن محلل..." : "Search analysts..."} 
              className={isRtl ? "pr-9" : "pl-9"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {filteredAnalysts.map((analyst) => (
                <div 
                  key={analyst.id}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted transition-colors ${currentAnalyst === analyst.name ? 'bg-primary/5 border border-primary/20' : ''}`}
                  onClick={() => onAssign(analyst)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UserCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{isRtl ? analyst.nameAr : analyst.name}</p>
                      <p className="text-xs text-muted-foreground">{analyst.specialization}</p>
                    </div>
                  </div>
                  {currentAnalyst === analyst.name && <Check className="h-4 w-4 text-primary" />}
                </div>
              ))}
              {filteredAnalysts.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {isRtl ? "لا يوجد نتائج" : "No results found"}
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
