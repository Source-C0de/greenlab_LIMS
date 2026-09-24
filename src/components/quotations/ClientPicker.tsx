/**
 * Search-and-pick a client from the mock list, with the option to inline-add
 * a new client when no match is found.
 *
 * Used inside the Quotation wizard's step 1. Pure UI — accepts the client
 * list as a prop so it stays decoupled from `mockClients`.
 */

import { useMemo, useState } from "react";
import { Search, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppContext } from "@/context/AppContext";
import { localUid } from "@/lib/quotation-utils";
import type { QuotationClientSnapshot } from "@/mock-data/quotations";

export interface ClientLike {
  id: string;
  nameEn: string;
  nameAr?: string;
  vatNo?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

interface ClientPickerProps {
  clients: ClientLike[];
  /** Called with the picked client (existing OR newly created). */
  onSelect: (client: ClientLike) => void;
  /** Optional callback the picker uses to add a brand-new client. */
  onCreateClient?: (client: ClientLike) => void;
  /** Currently selected client id (if any) — used to highlight the row. */
  selectedId?: string | null;
}

type Label = { en: string; ar: string };

const LABELS = {
  title:     { en: "Select or add a client",          ar: "اختر أو أضف عميلاً" } as Label,
  searchPh:  { en: "Search by name, VAT, phone, email", ar: "البحث بالاسم أو الرقم الضريبي أو الهاتف أو البريد" } as Label,
  empty:     { en: "No clients match.",                ar: "لا يوجد عملاء مطابقون." } as Label,
  noResults: { en: "No matches found.",                ar: "لم يتم العثور على نتائج." } as Label,
  addNew:    { en: "Add new client",                   ar: "إضافة عميل جديد" } as Label,
  selected:  { en: "Selected",                         ar: "محدد" } as Label,
  cancel:    { en: "Cancel",                           ar: "إلغاء" } as Label,
  create:    { en: "Create client",                    ar: "إنشاء العميل" } as Label,
  // Add-new sub-form
  nameEn:    { en: "Company name (EN)",                ar: "اسم الشركة (إنجليزي)" } as Label,
  nameAr:    { en: "Company name (AR)",                ar: "اسم الشركة (عربي)" } as Label,
  vatNo:     { en: "VAT number",                       ar: "الرقم الضريبي" } as Label,
  contact:   { en: "Contact person",                   ar: "الشخص المسؤول" } as Label,
  email:     { en: "Email",                            ar: "البريد الإلكتروني" } as Label,
  phone:     { en: "Phone",                            ar: "الهاتف" } as Label,
} as const;

function matches(client: ClientLike, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const haystack = [
    client.nameEn,
    client.nameAr ?? "",
    client.vatNo ?? "",
    client.email ?? "",
    client.phone ?? "",
    client.contactPerson ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(t);
}

function snapshotOf(c: ClientLike): QuotationClientSnapshot {
  return {
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    vatNo: c.vatNo,
    contactPerson: c.contactPerson,
    email: c.email,
    phone: c.phone,
  };
}

export function ClientPicker({
  clients,
  onSelect,
  onCreateClient,
  selectedId,
}: ClientPickerProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const pick = (l: Label) => (isRtl ? l.ar : l.en);

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(
    () => clients.filter((c) => matches(c, search)),
    [clients, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold">{pick(LABELS.title)}</h3>
        {onCreateClient && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 me-2" />
                {pick(LABELS.addNew)}
              </Button>
            </DialogTrigger>
            <AddClientDialog
              onCancel={() => setShowAdd(false)}
              onCreate={(c) => {
                onCreateClient(c);
                onSelect(c);
                setShowAdd(false);
              }}
            />
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={pick(LABELS.searchPh)}
          className="ps-9"
        />
      </div>

      <div className="rounded-md border divide-y max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {search ? pick(LABELS.noResults) : pick(LABELS.empty)}
          </div>
        ) : (
          filtered.map((c) => {
            const isSelected = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                className={`w-full text-start px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 ${
                  isSelected ? "bg-primary/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {isRtl && c.nameAr ? c.nameAr : c.nameEn}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[c.vatNo, c.contactPerson, c.email, c.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                {isSelected ? (
                  <Badge variant="default" className="shrink-0">
                    <Check className="h-3 w-3 me-1" />
                    {pick(LABELS.selected)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    {c.id}
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline "Add new client" sub-dialog
// ---------------------------------------------------------------------------

interface AddClientDialogProps {
  onCancel: () => void;
  onCreate: (client: ClientLike) => void;
}

function AddClientDialog({ onCancel, onCreate }: AddClientDialogProps) {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const pick = (l: Label) => (isRtl ? l.ar : l.en);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [vatNo, setVatNo] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const canSubmit = nameEn.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onCreate({
      id: `C-${localUid().toUpperCase()}`,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim() || undefined,
      vatNo: vatNo.trim() || undefined,
      contactPerson: contact.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{pick(LABELS.addNew)}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 py-2">
        <div className="grid gap-1.5">
          <Label htmlFor="new-client-name-en">{pick(LABELS.nameEn)}</Label>
          <Input
            id="new-client-name-en"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            autoFocus
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-client-name-ar">{pick(LABELS.nameAr)}</Label>
          <Input
            id="new-client-name-ar"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            dir="rtl"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-client-vat">{pick(LABELS.vatNo)}</Label>
          <Input
            id="new-client-vat"
            value={vatNo}
            onChange={(e) => setVatNo(e.target.value)}
            placeholder="3000…"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="new-client-contact">{pick(LABELS.contact)}</Label>
          <Input id="new-client-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-client-email">{pick(LABELS.email)}</Label>
            <Input
              id="new-client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-client-phone">{pick(LABELS.phone)}</Label>
            <Input id="new-client-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {pick(LABELS.cancel)}
        </Button>
        <Button onClick={submit} disabled={!canSubmit}>
          {pick(LABELS.create)}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Re-export the snapshot helper for the wizard to use when finalizing.
export { snapshotOf };
