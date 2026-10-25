// =========================================================================
// AttachmentsPicker — attach files (PDF / docs / images) to a request.
// =========================================================================
// The app is mock-only with no backend, so a file's *contents* are never
// read, uploaded or stored. We keep just the metadata we need to render a
// faithful attachment list: name, MIME type, byte size and a timestamp.
//
// Drop a file onto the zone or click it to open the file browser. Files are
// validated on type and size before being accepted, and duplicates (same
// name + size) are rejected.

import { useRef, useState } from "react";
import {
  File as FileIcon,
  FileImage,
  FileText,
  Paperclip,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { WorkOrderAttachment } from "@/infrastructure/mock/data/workOrders";

/** A file the user has staged but not yet saved. */
export type AttachmentDraft = Omit<WorkOrderAttachment, "id" | "addedAt">;

/** Max size of a single attachment, in bytes (10 MB). */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Accepted file extensions. The `accept` attribute uses these, and the drop
 * handler rejects anything not in this list.
 */
const ACCEPTED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
] as const;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

/** The `accept` attribute for the hidden file input. */
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Human-readable byte size, e.g. "240 KB" / "1.2 MB". */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function iconForFile(name: string) {
  if (IMAGE_EXTENSIONS.has(extensionOf(name))) return FileImage;
  if (extensionOf(name) === "pdf" || extensionOf(name) === "txt") return FileText;
  return FileIcon;
}

interface AttachmentsPickerProps {
  files: AttachmentDraft[];
  onChange: (next: AttachmentDraft[]) => void;
  isRtl: boolean;
}

export function AttachmentsPicker({
  files,
  onChange,
  isRtl,
}: AttachmentsPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const labels = {
    dropHere: isRtl
      ? "اسحب الملفات هنا أو انقر للاختيار"
      : "Drop files here or click to browse",
    formats: isRtl
      ? "PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG"
      : "PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JPG, PNG",
    browse: isRtl ? "اختر ملفات" : "Browse files",
    remove: isRtl ? "إزالة" : "Remove",
    count: isRtl
      ? `${files.length} ملف مرفق`
      : `${files.length} file${files.length === 1 ? "" : "s"} attached`,
    empty: isRtl
      ? "لم يتم إرفاق أي ملفات"
      : "No files attached yet.",
    tooLarge: isRtl
      ? "حجم الملف يتجاوز 10 ميجابايت"
      : "File size exceeds the 10 MB limit",
    badType: isRtl
      ? "نوع الملف غير مدعوم"
      : "Unsupported file type",
    duplicate: isRtl
      ? "هذا الملف مضاف بالفعل"
      : "This file has already been added",
  };

  const acceptFiles = (incoming: FileList | File[]) => {
    const accepted: AttachmentDraft[] = [];

    for (const file of Array.from(incoming)) {
      const ext = extensionOf(file.name);
      if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
        toast.error(`${labels.badType}: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${labels.tooLarge}: ${file.name}`);
        continue;
      }
      const isDuplicate = files.some(
        (f) => f.name === file.name && f.size === file.size,
      );
      if (isDuplicate) {
        toast.error(`${labels.duplicate}: ${file.name}`);
        continue;
      }
      accepted.push({
        name: file.name,
        size: file.size,
      });
    }

    if (accepted.length > 0) {
      onChange([...files, ...accepted]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      acceptFiles(e.dataTransfer.files);
    }
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      acceptFiles(e.target.files);
    }
    // Reset so re-picking the same file still fires a change event.
    e.target.value = "";
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/40 bg-muted/20 hover:bg-muted/40",
        )}
      >
        <UploadCloud
          className={cn(
            "h-8 w-8",
            isDragging ? "text-primary" : "text-muted-foreground opacity-50",
          )}
        />
        <div className="text-sm font-medium">{labels.dropHere}</div>
        <div className="text-xs text-muted-foreground">{labels.formats}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <Paperclip className="h-3.5 w-3.5 me-1" />
          {labels.browse}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          onChange={handleBrowse}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <ul className="divide-y rounded-md border bg-card">
          {files.map((f, idx) => {
            const Icon = iconForFile(f.name);
            return (
              <li
                key={`${f.name}-${idx}`}
                className="flex items-center gap-3 px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(f.size)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAt(idx)}
                  title={labels.remove}
                  aria-label={`${labels.remove}: ${f.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="text-xs text-muted-foreground">
        {files.length > 0 ? labels.count : labels.empty}
      </div>
    </div>
  );
}

interface AttachmentsListProps {
  attachments: WorkOrderAttachment[];
  isRtl: boolean;
  className?: string;
}

/** Read-only rendering of saved attachments (used on the request detail page). */
export function AttachmentsList({
  attachments,
  isRtl,
  className,
}: AttachmentsListProps) {
  const empty = isRtl ? "لا توجد مرفقات" : "No attachments";

  if (attachments.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>{empty}</p>
    );
  }

  return (
    <ul className={cn("divide-y rounded-md border bg-card", className)}>
      {attachments.map((a) => {
        const Icon = iconForFile(a.name);
        return (
          <li key={a.id} className="flex items-center gap-3 px-3 py-2">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{a.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(a.size)} •{" "}
                {a.addedAt.split("T")[0]}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
