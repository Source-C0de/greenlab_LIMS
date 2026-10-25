/**
 * Map backend error codes (`ApiErrorBody.code`) to bilingual toast
 * messages. Centralized so every mutation surfaces a consistent UX.
 *
 * Unknown codes fall back to the server's `message` (English/Arabic as the
 * server sent it) — never lose information the backend gave us.
 */

import { ApiError } from "@/infrastructure/api/api";
import {
  extractValidationIssues,
  getApiErrorCode,
} from "@/infrastructure/api/response";

type Lang = "en" | "ar";

const CODE_MESSAGES: Record<string, { en: string; ar: string }> = {
  // Users — §1
  duplicate_email: { en: "An account with that email already exists.", ar: "يوجد حساب بهذا البريد الإلكتروني بالفعل." },
  duplicate_username: { en: "That username is already taken.", ar: "اسم المستخدم هذا محجوز." },
  confirm_mismatch: { en: "The typed confirmation does not match the username.", ar: "التأكيد المكتوب لا يطابق اسم المستخدم." },
  self_demotion: { en: "You cannot remove your own admin role while you are the last admin.", ar: "لا يمكنك إزالة دور المسؤول عن نفسك وأنت المسؤول الأخير." },
  last_admin: { en: "The lab must always have at least one active admin.", ar: "يجب أن يبقى هناك مسؤول واحد نشط على الأقل." },
  unauthorized: { en: "Your session has expired. Please log in again.", ar: "انتهت صلاحية جلستك. يُرجى تسجيل الدخول مرة أخرى." },
  forbidden: { en: "You do not have permission to perform this action.", ar: "ليس لديك إذن لتنفيذ هذا الإجراء." },
  not_found: { en: "The requested record was not found.", ar: "السجل المطلوب غير موجود." },
  stale_write: { en: "This record was changed by someone else. Please refresh and retry.", ar: "تم تعديل هذا السجل من قِبل مستخدم آخر. حدِّث الصفحة وأعِد المحاولة." },
  locked: { en: "This account is locked. Contact support.", ar: "هذا الحساب مقفل. تواصل مع الدعم." },
  validation: { en: "Please check the form fields and try again.", ar: "يُرجى التحقق من حقول النموذج وإعادة المحاولة." },
  validation_error: { en: "Please check the form fields and try again.", ar: "يُرجى التحقق من حقول النموذج وإعادة المحاولة." },
  bad_request: { en: "The request was rejected. Please check the values you sent.", ar: "تم رفض الطلب. يُرجى التحقق من القيم المُرسلة." },
  conflict: { en: "That record already exists.", ar: "هذا السجل موجود بالفعل." },
  gone: { en: "That file is no longer available.", ar: "هذا الملف لم يعد متاحًا." },
  rate_limited: { en: "Too many requests. Please slow down and try again shortly.", ar: "عدد كبير جدًا من الطلبات. يُرجى الانتظار قليلًا والمحاولة مرة أخرى." },
  internal_error: { en: "Something went wrong on our side. Please try again.", ar: "حدث خطأ في الخادم. يُرجى المحاولة مرة أخرى." },

  // Roles — §2
  slug_reserved: { en: "This slug is reserved by a built-in role.", ar: "هذا المعرّف محجوز لدور مدمج." },
  duplicate_slug: { en: "A role with this slug already exists.", ar: "يوجد دور بهذا المعرّف بالفعل." },
  role_in_use: { en: "At least one user is still assigned to this role. Reassign them first.", ar: "لا يزال هناك مستخدمون مُسنَدون لهذا الدور. أعِد تعيينهم أولًا." },
  fixed_role_immutable: { en: "Built-in roles cannot be deleted. Archive them instead.", ar: "لا يمكن حذف الأدوار المدمجة. يمكنك أرشفتها بدلًا من ذلك." },
};

/** Best-effort message extractor. Returns `{en, ar}` so callers can render
 * the bilingual message via `useAppContext().language`. */
export function describeApiError(err: unknown, lang: Lang = "en"): {
  en: string;
  ar: string;
  code: string | null;
} {
  if (!(err instanceof ApiError)) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { en: msg, ar: msg, code: null };
  }

  const code = getApiErrorCode(err);
  const body = err.body;

  // Try to pull the server's own `error.message` (always English per spec).
  let serverMsg: string | null = null;
  if (
    body &&
    typeof body === "object" &&
    "error" in (body as Record<string, unknown>)
  ) {
    const e = (body as { error?: { message?: unknown } }).error;
    if (e && typeof e.message === "string") serverMsg = e.message;
  }

  if (code && CODE_MESSAGES[code]) {
    return { ...CODE_MESSAGES[code], code };
  }
  // Unknown code — show the server message; mirror it to both languages.
  return {
    en: serverMsg ?? err.message,
    ar: serverMsg ?? err.message,
    code,
  };
}
/**
 * A detailed, single-string description of an API error — for surfaces that
 * show one error block (a form, a dialog) rather than a bilingual toast.
 *
 * This is deliberately a *different* function from `describeApiError`: the two
 * serve genuinely different UI needs (toast vs. inline block), and they used
 * to share a name, which made the call sites ambiguous.
 */
export function describeApiErrorDetailed(
  err: unknown,
  fallback: string,
): { title: string; description?: string } {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status) || 0
      : 0;

  const body =
    err && typeof err === "object" && "body" in err
      ? (err as { body: unknown }).body
      : undefined;

  const issues = extractValidationIssues(body);
  if (issues.length > 0) {
    return {
      title: `${status} — ${issues.length} validation ${
        issues.length === 1 ? "issue" : "issues"
      }`,
      description: issues
        .map((v) => `${v.loc?.join(".") || "field"}: ${v.msg ?? "invalid"}`)
        .join("\n"),
    };
  }

  const message =
    err instanceof ApiError && err.message
      ? err.message
      : err instanceof Error
        ? err.message
        : fallback;

  return { title: `${status || "Error"} — ${message || fallback}` };
}
