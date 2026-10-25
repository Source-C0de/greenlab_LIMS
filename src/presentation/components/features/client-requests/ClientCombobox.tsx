// =========================================================================
// ClientCombobox — searchable client picker with free-text fallback.
// =========================================================================
// Replaces a plain <Select> of clients with a searchable combobox so the CSR
// can type part of a client name instead of scrolling a long dropdown.
//
// The filter matches the English AND the Arabic name, so either script can be
// typed regardless of the UI language.
//
// If the typed text doesn't match any existing client, a "Use "<name>"" row
// appears so the request can be filed against a client who isn't in the
// directory yet. A manually typed client is NOT added to the client list —
// only the name travels with the request.
//
// The value is a discriminated union because a manual client has no id:
//   { kind: "existing"; clientId: string } | { kind: "manual"; name: string }

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { mockClients } from "@/infrastructure/mock/data/clients";

/** The selected client — either a directory entry or a manually typed name. */
export type ClientSelection =
  | { kind: "existing"; clientId: string }
  | { kind: "manual"; name: string };

interface ClientComboboxProps {
  /** Selected client, or null when nothing is selected yet. */
  value: ClientSelection | null;
  onChange: (selection: ClientSelection) => void;
  isRtl: boolean;
}

export function ClientCombobox({
  value,
  onChange,
  isRtl,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const labels = {
    placeholder: isRtl ? "ابحث عن عميل..." : "Search for a client...",
    searchPh: isRtl
      ? "اكتب اسم العميل للبحث..."
      : "Type a client name to search...",
    useTyped: isRtl ? "استخدم" : "Use",
    manual: isRtl ? "اسم جديد (غير مسجل)" : "New name (not in directory)",
  };

  // Existing clients matching the typed text. Matches the English AND the
  // Arabic name so either script can be typed.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mockClients;
    return mockClients.filter((c) =>
      `${c.id} ${c.nameEn} ${c.nameAr} ${c.type} ${c.contactPerson}`
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  // A manually typed name is offered only when it doesn't match an existing
  // client (case-insensitively, on either name).
  const manualName = query.trim();
  const hasExactMatch = useMemo(() => {
    const q = manualName.toLowerCase();
    if (!q) return false;
    return mockClients.some(
      (c) => c.nameEn.toLowerCase() === q || c.nameAr.toLowerCase() === q,
    );
  }, [manualName]);
  const showManualOption = manualName.length > 0 && !hasExactMatch;

  // Label shown on the trigger.
  const selectedLabel = useMemo(() => {
    if (!value) return null;
    if (value.kind === "manual") return value.name;
    const c = mockClients.find((x) => x.id === value.clientId);
    if (!c) return null;
    return isRtl ? c.nameAr : c.nameEn;
  }, [value, isRtl]);

  const isSelected = (clientId: string) =>
    value?.kind === "existing" && value.clientId === clientId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
          )}
        >
          <span className="truncate text-start">
            {selectedLabel ?? labels.placeholder}
          </span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={labels.searchPh}
          />
          <CommandList>
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => {
                      onChange({ kind: "existing", clientId: c.id });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected(c.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {isRtl ? c.nameAr : c.nameEn}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {isRtl ? c.nameEn : c.nameAr} • {c.type}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {showManualOption && (
              <CommandItem
                value={`__manual__:${manualName}`}
                onSelect={() => {
                  onChange({ kind: "manual", name: manualName });
                  setOpen(false);
                }}
                className="font-medium"
              >
                <UserPlus className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {labels.useTyped} “{manualName}”
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {labels.manual}
                  </div>
                </div>
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
