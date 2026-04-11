import { useState } from "react";
import { mockClients as initialClients } from "@/mock-data/clients";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin, Phone, Mail, Loader2, Edit, Trash2 } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const clientSchema = z.object({
  nameEn: z.string().min(3, "English name must be at least 3 characters"),
  nameAr: z.string().min(3, "Arabic name must be at least 3 characters"),
  type: z.string().min(2, "Industry type is required"),
  vatNo: z.string().regex(/^\d{15}$/, "VAT number must be exactly 15 digits"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number"),
  city: z.string().min(2, "City is required"),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientsList() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [clients, setClients] = useState(initialClients);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manageSheetOpen, setManageSheetOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<typeof initialClients[0] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  const onAddClient = (data: ClientFormValues) => {
    setIsSubmiting(true);
    setTimeout(() => {
      const newClient = {
        id: `C00${clients.length + 1}`,
        ...data
      };
      setClients([newClient, ...clients]);
      setIsSubmiting(false);
      setAddDialogOpen(false);
      reset();
      toast.success("Client added successfully");
    }, 1000);
  };

  const handleManage = (client: typeof initialClients[0]) => {
    setSelectedClient(client);
    setManageSheetOpen(true);
  };

  const columns = [
    { 
      key: "name", 
      header: "Client Name",
      render: (item: typeof initialClients[0]) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{isRtl ? item.nameAr : item.nameEn}</p>
            <p className="text-xs text-muted-foreground font-mono">VAT: {item.vatNo}</p>
          </div>
        </div>
      )
    },
    { key: "type", header: "Industry" },
    { 
      key: "contact", 
      header: "Contact",
      render: (item: typeof initialClients[0]) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span>{item.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{item.phone}</span>
          </div>
        </div>
      )
    },
    { 
      key: "city", 
      header: "Location",
      render: (item: typeof initialClients[0]) => (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{item.city}, KSA</span>
        </div>
      )
    },
    { 
      key: "actions", 
      header: "",
      render: (item: typeof initialClients[0]) => (
        <Button variant="ghost" size="sm" onClick={() => handleManage(item)}>Manage</Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients Directory</h1>
          <p className="text-muted-foreground mt-1">Manage laboratory clients and billing details</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Register a new corporate client for laboratory services.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit(onAddClient)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nameEn">Name (English)</Label>
                  <Input id="nameEn" placeholder="e.g. Saudi Aramco" {...register("nameEn")} />
                  {errors.nameEn && <p className="text-xs text-destructive">{errors.nameEn.message}</p>}
                </div>
                <div className="grid gap-2 text-right">
                  <Label htmlFor="nameAr" className="text-right">الاسم (بالعربي)</Label>
                  <Input id="nameAr" dir="rtl" placeholder="أرامكو السعودية" {...register("nameAr")} />
                  {errors.nameAr && <p className="text-xs text-destructive text-right">{errors.nameAr.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Industry Type</Label>
                  <Input id="type" placeholder="e.g. Oil & Gas" {...register("type")} />
                  {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vatNo">VAT Number</Label>
                  <Input id="vatNo" placeholder="15 digits" {...register("vatNo")} />
                  {errors.vatNo && <p className="text-xs text-destructive">{errors.vatNo.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="client@example.com" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+966..." {...register("phone")} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="e.g. Riyadh" {...register("city")} />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmiting}>
                  {isSubmiting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : "Create Client"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        data={clients} 
        columns={columns} 
        searchKey="nameEn" 
        searchPlaceholder="Search clients..."
      />

      {/* Management Drawer */}
      <Sheet open={manageSheetOpen} onOpenChange={setManageSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Manage Client</SheetTitle>
            <SheetDescription>
              View and manage settings for this client account.
            </SheetDescription>
          </SheetHeader>
          
          {selectedClient && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{isRtl ? selectedClient.nameAr : selectedClient.nameEn}</h3>
                  <p className="text-sm text-muted-foreground">{selectedClient.type}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account Information</h4>
                <div className="grid gap-4">
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">VAT Number</span>
                    <span className="font-mono">{selectedClient.vatNo}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Contact Email</span>
                    <span>{selectedClient.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{selectedClient.phone}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Location</span>
                    <span>{selectedClient.city}, KSA</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <Button variant="outline" className="flex-1">
                  <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Button>
                <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Deactivate
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
