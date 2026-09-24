/**
 * localStorage helpers for Quotation drafts.
 *
 * Drafts are stored under one key per draft so the list view can render them
 * alongside issued quotations without colliding. The key is prefixed so a
 * future "clear drafts" action can wipe them in one shot.
 */

import type { Quotation } from "@/mock-data/quotations";

const KEY_PREFIX = "glims_quotation_draft_";

const draftKey = (id: string): string => `${KEY_PREFIX}${id}`;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota — fall through, draft just won't survive refresh.
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function saveDraft(q: Quotation): void {
  if (!q.draftId) return;
  safeSet(draftKey(q.draftId), JSON.stringify(q));
}

export function loadDraft(id: string): Quotation | null {
  if (typeof window === "undefined") return null;
  return safeParse<Quotation>(window.localStorage.getItem(draftKey(id)));
}

export function deleteDraft(id: string): void {
  safeRemove(draftKey(id));
}

/** Enumerate every draft currently in storage. Tolerates corrupt entries. */
export function listDrafts(): Quotation[] {
  if (typeof window === "undefined") return [];
  const out: Quotation[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      const parsed = safeParse<Quotation>(window.localStorage.getItem(key));
      if (parsed) out.push(parsed);
    }
  } catch {
    // ignore — iteration can throw in some browsers under strict mode
  }
  return out;
}
