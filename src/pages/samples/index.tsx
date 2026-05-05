import { useState } from "react";
import { Link } from "wouter";
import { mockSamples, mockClients, sampleTypes, mockSpecifications } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, Loader2, Beaker, Info } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const sampleSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  sampleType: z.string().min(1, "Please select a sample type"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  priority: z.string().min(1, "Please select priority"),
});

type SampleFormValues = z.infer<typeof sampleSchema>;

export default function SamplesList() {
  const { currentRole, language } = useAppContext();
  const isRtl = language === 'ar';
  const [samples, setSamples] = useState(mockSamples);
  const [isAdding, setIsAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SampleFormValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      priority: "Normal",
    }
  });

  const watchedSampleType = watch("sampleType");

  // Auto-load specification when sample type changes
  useState(() => {
    if (watchedSampleType) {
      const spec = mockSpecifications.find(s => s.productName === watchedSampleType);
      setSelectedSpec(spec || null);
    }
  });

  // Effect to watch sampleType and update selectedSpec
  const handleTypeChange = (val: string) => {
    setValue("sampleType", val);
    const spec = mockSpecifications.find(s => s.productName === val);
    setSelectedSpec(spec || null);
    if (spec) {
      toast.info(isRtl ? `تم تحميل مواصفة ${val} تلقائياً` : `Auto-loaded ${val} specification`, {
        description: isRtl ? `تمت إضافة ${spec.parameters.length} اختبارات` : `Added ${spec.parameters.length} test parameters automatically.`
      });
    }
  };

  const onSubmit = (data: SampleFormValues) => {
    setIsAdding(true);
    
    // Simulate API call
    setTimeout(() => {
      const client = mockClients.find(c => c.id === data.clientId);
      
      // Auto-load tests from spec if available
      const tests = selectedSpec ? selectedSpec.parameters.map((p: any, idx: number) => ({
        id: `T-${String(idx + 1).padStart(3, '0')}`,
        name: p.name,
        category: "Chemical", // Default or from parameter library
        method: p.method,
        status: "Pending",
        parameters: [
          { 
            id: `P-${idx}`, 
            name: p.name, 
            value: "", 
            unit: p.unit, 
            min: p.min, 
            max: p.max, 
            target: p.target,
            limitType: p.limitType,
            status: "Pending" 
          }
        ]
      })) : [];

      const newSample = {
        id: `SAM-2024-${String(samples.length + 1).padStart(3, '0')}`,
        clientId: data.clientId,
        clientName: client ? (language === 'ar' ? client.nameAr : client.nameEn) : "Unknown Client",
        sampleType: data.sampleType,
        description: data.description,
        status: "Received",
        assignedAnalyst: null,
        receivedDate: new Date().toISOString().split('T')[0],
        completedDate: null,
        priority: data.priority,
        tests: tests,
      };

      setSamples([newSample, ...samples]);
      setIsAdding(false);
      setOpen(false);
      reset();
      setSelectedSpec(null);
      toast.success("Sample registered successfully with linked specification");
    }, 1000);
  };

  const handleExport = () => {
    const headers = ["ID", "Client", "Type", "Status", "Priority", "Received Date"];
    const csvContent = [
      headers.join(","),
      ...samples.map(s => [
        s.id,
        `"${s.clientName}"`,
        s.sampleType,
        s.status,
        s.priority,
        s.receivedDate
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `samples_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Samples exported to CSV");
  };
  
  const columns = [
    { 
      key: "id", 
      header: "Sample ID",
      render: (item: any) => <span className="font-mono font-medium">{item.id}</span>
    },
    { key: "clientName", header: "Client" },
    { key: "sampleType", header: "Type" },
    { 
      key: "status", 
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />
    },
    { 
      key: "priority", 
      header: "Priority",
      render: (item: any) => {
        const color = item.priority === 'Urgent' ? 'text-red-600' : 
                      item.priority === 'High' ? 'text-amber-600' : 'text-muted-foreground';
        return <span className={`font-medium text-sm ${color}`}>{item.priority}</span>;
      }
    },
    { key: "receivedDate", header: "Received Date" },
    { 
      key: "actions", 
      header: "",
      render: (item: any) => (
        <Link href={`/samples/${item.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {currentRole === 'client' ? (isRtl ? "عيناتي" : "My Samples") : (isRtl ? "إدارة العينات" : "Samples Management")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentRole === 'client' 
              ? (isRtl ? "تتبع عيناتك ونتائج الفحوصات الخاصة بك" : "Track your laboratory samples and test results")
              : (isRtl ? "إدارة وتتبع جميع عينات المختبر" : "Manage and track all laboratory samples")}
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> {isRtl ? "تصفية" : "Filter"}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> {isRtl ? "تصدير" : "Export"}
          </Button>
          
          {(currentRole === "admin" || currentRole === "lab_manager") && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> New Sample
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Register New Sample</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to register a new laboratory sample.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="clientId">Client</Label>
                    <Select onValueChange={(val) => setValue("clientId", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {language === 'ar' ? client.nameAr : client.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="sampleType">Sample Type</Label>
                      <Select onValueChange={handleTypeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {sampleTypes.map(t => (
                            <SelectItem key={t.type} value={t.type}>{t.type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.sampleType && <p className="text-xs text-destructive">{errors.sampleType.message}</p>}
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select onValueChange={(val) => setValue("priority", val)} defaultValue="Normal">
                        <SelectTrigger>
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
                    </div>
                  </div>

                  {selectedSpec && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary uppercase flex items-center gap-1">
                          <Beaker className="h-3 w-3" /> Linked Specification
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4">{selectedSpec.code}</Badge>
                      </div>
                      <p className="text-sm font-medium">{selectedSpec.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedSpec.parameters.map((p: any) => (
                          <Badge key={p.parameterId} variant="secondary" className="text-[10px] font-normal py-0">
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
                        <Info className="h-3 w-3" /> All tests will load automatically
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="description">Sample Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Enter detailed description of the sample..."
                      {...register("description")}
                    />
                    {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isAdding}>
                      {isAdding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : "Register Sample"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <DataTable 
        data={samples} 
        columns={columns} 
        searchKey="id" 
        searchPlaceholder="Search sample ID..."
      />
    </div>
  );
}

