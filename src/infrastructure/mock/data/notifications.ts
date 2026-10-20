export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: NotificationType;
  date: string;
  read: boolean;
  link?: string;
  roles?: string[]; // If undefined, applies to all roles
}

export const mockNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "New Samples Assigned",
    titleAr: "تم تعيين عينات جديدة",
    message: "You have 5 new water samples assigned for testing.",
    messageAr: "تم تعيين 5 عينات مياه جديدة لك لاختبارها.",
    type: "info",
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    link: "/samples",
    roles: ["analyst", "lab_manager", "admin"]
  },
  {
    id: "n2",
    title: "Sample Processing Complete",
    titleAr: "اكتملت معالجة العينة",
    message: "Results for SMP-2024-001 have been uploaded. Awaiting review.",
    messageAr: "تم رفع نتائج العينة SMP-2024-001. في انتظار المراجعة.",
    type: "success",
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    link: "/samples",
    roles: ["lab_manager", "admin"]
  },
  {
    id: "n3",
    title: "Results Available",
    titleAr: "النتائج متاحة",
    message: "Your sample SMP-2024-001 has been processed and results are ready.",
    messageAr: "تمت معالجة عينتك SMP-2024-001 والنتائج جاهزة.",
    type: "success",
    date: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    read: false,
    link: "/client-portal",
    roles: ["client"]
  },
  {
    id: "n4",
    title: "New Invoice Generated",
    titleAr: "تم إنشاء فاتورة جديدة",
    message: "Invoice INV-004 has been generated for Saudi Aramco.",
    messageAr: "تم إنشاء الفاتورة INV-004 لشركة أرامكو السعودية.",
    type: "info",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    link: "/invoices",
    roles: ["accountant", "admin"]
  },
  {
    id: "n5",
    title: "Payment Received",
    titleAr: "تم استلام الدفعة",
    message: "Payment for invoice INV-003 has been successfully received.",
    messageAr: "تم استلام الدفعة للفاتورة INV-003 بنجاح.",
    type: "success",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    link: "/invoices",
    roles: ["accountant", "admin", "client"]
  },
  {
    id: "n6",
    title: "Equipment Calibration Required",
    titleAr: "مطلوب معايرة المعدات",
    message: "GC-MS machine 02 is due for calibration in 2 days.",
    messageAr: "يجب معايرة آلة GC-MS رقم 02 خلال يومين.",
    type: "warning",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), 
    read: true,
    roles: ["lab_manager", "admin"]
  },
  {
    id: "n7",
    title: "Report Approved",
    titleAr: "تم اعتماد التقرير",
    message: "Report REP-2024-012 has been approved by the Lab Manager.",
    messageAr: "تم اعتماد التقرير REP-2024-012 من قبل مدير المختبر.",
    type: "success",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: true,
    link: "/reports",
    roles: ["lab_manager", "analyst", "client", "admin"]
  }
];
