/**
 * Map backend error codes (`ApiErrorBody.code`) to bilingual toast
 * messages. Centralized so every mutation surfaces a consistent UX.
 *
 * Unknown codes fall back to the server's `message` (English/Arabic as the
 * server sent it) — never lose information the backend gave us.
 */

import { ApiError } from "@/infrastructure/api/api";
import { getApiErrorCode } from "@/infrastructure/api/clients/usersApi";

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