import { useState } from "react";
import { mockReagents as initialReagents } from "@/mock-data";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Plus, Loader2, Edit2, History } from "lucide-react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const reagentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  nameAr: z.string().min(3, "Arabic name must be at least 3 characters"),
  lotNo: z.string().min(2, "Lot number is required"),
  supplier: z.string().min(2, "Supplier is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  minStock: z.coerce.number().min(0, "Minimum stock cannot be negative"),
});

const updateQuantitySchema = z.object({
  newQuantity: z.coerce.number().min(0, "Quantity cannot be negative"),
});

type ReagentFormValues = z.infer<typeof reagentSchema>;
type UpdateQuantityFormValues = z.infer<typeof updateQuantitySchema>;

export default function InventoryList() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const [reagents, setReagents] = useState(initialReagents);
  const [isSubmiting, setIsSubmiting] = useState(false);
  
  const [addOpen, setAddOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedReagent, setSelectedReagent] = useState<typeof initialReagents[0] | null>(null);

  const getStatus = (quantity: number, minStock: number, expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    if (expiry < now) return "Expired";
    if (quantity <= minStock) return "Low Stock";
    return "OK";
  };

  const addForm = useForm<ReagentFormValues>({
    resolver: zodResolver(reagentSchema),
  });

  const updateForm = useForm<UpdateQuantityFormValues>({
    resolver: zodResolver(updateQuantitySchema),
  });

  const onAddReagent = (data: ReagentFormValues) => {
    setIsSubmiting(true);
    setTimeout(() => {
      const newReagent = {
        id: `REG-${String(reagents.length + 1).padStart(3, '0')}`,
        ...data,
        status: getStatus(data.quantity, data.minStock, data.expiryDate)
      };
      setReagents([newReagent, ...reagents]);
      setIsSubmiting(false);
      setAddOpen(false);
      addForm.reset();
      toast.success("New stock received successfully");
    }, 1000);
  };

  const onUpdateQuantity = (data: UpdateQuantityFormValues) => {
    if (!selectedReagent) return;
    setIsSubmiting(true);
    setTimeout(() => {
      const updatedReagents = reagents.map(r => 
        r.id === selectedReagent.id 
          ? { 
              ...r, 
              quantity: data.newQuantity, 
              status: getStatus(data.newQuantity, r.minStock, r.expiryDate) 
            } 
          : r
      );
      setReagents(updatedReagents);
      setIsSubmiting(false);
      setUpdateOpen(false);
      toast.success("Quantity updated successfully");
    }, 800);
  };

  const openUpdateDialog = (reagent: typeof initialReagents[0]) => {
    setSelectedReagent(reagent);
    updateForm.setValue("newQuantity", reagent.quantity);
    setUpdateOpen(true);
  };

  const columns = [
    { 
      key: "name", 
      header: "Reagent / Material",
      render: (item: typeof initialReagents[0]) => (
        <div className="font-medium">
          {isRtl ? item.nameAr : item.name}
          <div className="text-xs text-muted-foreground font-normal">Supplier: {item.supplier}</div>
        </div>
      )
    },
    { key: "lotNo", header: "Lot Number" },
    { 
      key: "quantity", 
      header: "Stock Level",
      render: (item: typeof initialReagents[0]) => (
        <div className="flex items-center gap-2">
          <span className={`font-bold ${item.quantity <= item.minStock ? 'text-destructive' : ''}`}>
            {item.quantity} {item.unit}
          </span>
          <span className="text-xs text-muted-foreground">(Min: {item.minStock})</span>
        </div>
      )
    },
    { key: "expiryDate", header: "Expiry Date" },
    { 
      key: "status", 
      header: "Status",
      render: (item: typeof initialReagents[0]) => <StatusBadge status={item.status} />
    },
    { 
      key: "actions", 
      header: "",
      render: (item: typeof initialReagents[0]) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openUpdateDialog(item)}>
            <Edit2 className="h-4 w-4 mr-1" /> Update
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <History className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  const alertsCount = reagents.filter(r => r.status === 'Low Stock' || r.status === 'Expired').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reagent Inventory</h1>
          <p className="text-muted-foreground mt-1">Track laboratory consumables and reagents</p>
        </div>
        
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Receive Items
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Receive New Stock</DialogTitle>
              <DialogDescription>
                Record the arrival of new reagents or laboratory consumables.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={addForm.handleSubmit(onAddReagent)} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name (English)</Label>
                  <Input id="name" placeholder="e.g. Ethanol 99%" {...addForm.register("name")} />
                  {addForm.formState.errors.name && <p className="text-xs text-destructive">{addForm.formState.errors.name.message}</p>}
                </div>
                <div className="grid gap-2 text-right">
                  <Label htmlFor="nameAr">الاسم (بالعربي)</Label>
                  <Input id="nameAr" dir="rtl" placeholder="إيثانول 99%" {...addForm.register("nameAr")} />
                  {addForm.formState.errors.nameAr && <p className="text-xs text-destructive">{addForm.formState.errors.nameAr.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lotNo">Lot / Batch Number</Label>
                  <Input id="lotNo" placeholder="LOT-12345" {...addForm.register("lotNo")} />
                  {addForm.formState.errors.lotNo && <p className="text-xs text-destructive">{addForm.formState.errors.lotNo.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" placeholder="e.g. Merck" {...addForm.register("supplier")} />
                  {addForm.formState.errors.supplier && <p className="text-xs text-destructive">{addForm.formState.errors.supplier.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" {...addForm.register("quantity")} />
                  {addForm.formState.errors.quantity && <p className="text-xs text-destructive">{addForm.formState.errors.quantity.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" placeholder="L, kg, vial..." {...addForm.register("unit")} />
                  {addForm.formState.errors.unit && <p className="text-xs text-destructive">{addForm.formState.errors.unit.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Min Stock Level</Label>
                  <Input id="minStock" type="number" {...addForm.register("minStock")} />
                  {addForm.formState.errors.minStock && <p className="text-xs text-destructive">{addForm.formState.errors.minStock.message}</p>}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" {...addForm.register("expiryDate")} />
                {addForm.formState.errors.expiryDate && <p className="text-xs text-destructive">{addForm.formState.errors.expiryDate.message}</p>}
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmiting}>
                  {isSubmiting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : "Register Items"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {alertsCount > 0 && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Attention Required</h3>
              <p className="text-sm text-destructive/80 mt-1">
                You have {alertsCount} items that are low on stock or expired. Please review and reorder.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable 
        data={reagents} 
        columns={columns} 
        searchKey="name" 
        searchPlaceholder="Search reagents..."
      />

      {/* Update Quantity Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Inventory Level</DialogTitle>
            <DialogDescription>
              Adjust current stock for: <span className="font-bold">{selectedReagent?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={updateForm.handleSubmit(onUpdateQuantity)} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newQuantity">New Quantity ({selectedReagent?.unit})</Label>
              <Input id="newQuantity" type="number" {...updateForm.register("newQuantity")} />
              {updateForm.formState.errors.newQuantity && <p className="text-xs text-destructive">{updateForm.formState.errors.newQuantity.message}</p>}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setUpdateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmiting}>
                {isSubmiting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

