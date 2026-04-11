import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useAppContext, Role } from "@/context/AppContext";

export function RoleSwitcher() {
  const { currentRole, setCurrentRole, language } = useAppContext();
  const isRtl = language === "ar";

  return (
    <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as Role)}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue placeholder="Role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">{isRtl ? "مدير النظام" : "Admin"}</SelectItem>
        <SelectItem value="lab_manager">{isRtl ? "مدير المختبر" : "Lab Manager"}</SelectItem>
        <SelectItem value="analyst">{isRtl ? "محلل" : "Analyst"}</SelectItem>
        <SelectItem value="client">{isRtl ? "عميل" : "Client"}</SelectItem>
        <SelectItem value="accountant">{isRtl ? "محاسب" : "Accountant"}</SelectItem>
      </SelectContent>
    </Select>
  );
}
