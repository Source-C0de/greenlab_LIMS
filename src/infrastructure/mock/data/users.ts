import type { Role } from "@/shared/lib/types";

/**
 * SaaS user accounts. The project is single-tenant (see
 * `docs/api/data-model.md` §2), so users do **not** carry a `tenantId`.
 * `superadmin` and `admin` are roles within the same tenant, not path
 * scopes — matching the contract in `docs/api/README.md:24-43`.
 *
 * Bilingual fields: `fullNameEn` / `fullNameAr` (the project convention;
 * see the `add-mock-data` skill).
 */
export type UserStatus = "active" | "trial" | "suspended" | "disabled";

export interface SaaSUser {
  id: string;
  email: string;
  username: string;
  fullNameEn: string;
  fullNameAr: string;
  role: Role;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
}

export const mockUsers: SaaSUser[] = [
  {
    id: "U001",
    email: "sarah.alotaibi@greenlablims.sa",
    username: "sarah.admin",
    fullNameEn: "Sarah Al-Otaibi",
    fullNameAr: "سارة العتيبي",
    role: "superadmin",
    status: "active",
    lastLoginAt: "2026-10-17T08:42:00Z",
    createdAt: "2023-03-01T09:00:00Z",
  },
  {
    id: "U002",
    email: "khaled.alharbi@greenlablims.sa",
    username: "khaled.admin",
    fullNameEn: "Khaled Al-Harbi",
    fullNameAr: "خالد الحربي",
    role: "admin",
    status: "active",
    lastLoginAt: "2026-10-18T07:15:00Z",
    createdAt: "2023-03-05T10:00:00Z",
  },
  {
    id: "U003",
    email: "mona.alshamrani@greenlablims.sa",
    username: "mona.lab",
    fullNameEn: "Mona Al-Shamrani",
    fullNameAr: "منى الشمراني",
    role: "lab_manager",
    status: "active",
    lastLoginAt: "2026-10-18T06:50:00Z",
    createdAt: "2023-04-12T11:30:00Z",
  },
  {
    id: "U004",
    email: "faisal.alqahtani@greenlablims.sa",
    username: "faisal.lab",
    fullNameEn: "Faisal Al-Qahtani",
    fullNameAr: "فيصل القحطاني",
    role: "analyst",
    status: "active",
    lastLoginAt: "2026-10-18T05:20:00Z",
    createdAt: "2023-05-22T08:15:00Z",
  },
  {
    id: "U005",
    email: "noura.almutairi@greenlablims.sa",
    username: "noura.acc",
    fullNameEn: "Noura Al-Mutairi",
    fullNameAr: "نورة المطيري",
    role: "accountant",
    status: "active",
    lastLoginAt: "2026-10-17T16:05:00Z",
    createdAt: "2023-06-30T12:00:00Z",
  },
  {
    id: "U006",
    email: "abdulrahman.alghamdi@greenlablims.sa",
    username: "abdulrahman.recep",
    fullNameEn: "Abdulrahman Al-Ghamdi",
    fullNameAr: "عبدالرحمن الغامدي",
    role: "receptionist",
    status: "active",
    lastLoginAt: "2026-10-18T07:55:00Z",
    createdAt: "2023-08-14T09:45:00Z",
  },
  {
    id: "U007",
    email: "hana.alzahrani@greenlablims.sa",
    username: "hana.client",
    fullNameEn: "Hana Al-Zahrani",
    fullNameAr: "هناء الزهراني",
    role: "client",
    status: "trial",
    lastLoginAt: "2026-10-15T13:30:00Z",
    createdAt: "2026-09-20T10:00:00Z",
  },
  {
    id: "U008",
    email: "majed.aldosari@greenlablims.sa",
    username: "majed.admin",
    fullNameEn: "Majed Al-Dosari",
    fullNameAr: "ماجد الدوسري",
    role: "admin",
    status: "suspended",
    lastLoginAt: "2026-08-02T11:10:00Z",
    createdAt: "2024-02-18T14:00:00Z",
  },
];
