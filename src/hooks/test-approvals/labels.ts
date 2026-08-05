// =========================================================================
// Bilingual labels for the 3-stage test approval workflow
// =========================================================================

export type Lang = "en" | "ar";

export interface ApprovalLabels {
  queueTitle: string;
  mySubmissionsTitle: string;
  queueSubtitle: string;
  mySubmissionsSubtitle: string;

  // Stage names (used in badges, headers, history)
  stageLabSupervisor: string;
  stageTechManager: string;
  stageQa: string;
  stageApproved: string;

  // Per-stage status pill labels
  awaitingLabSupervisor: string;
  awaitingTechManager: string;
  awaitingQa: string;
  qaApproved: string;

  // Actions / generic
  approve: string;
  reject: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonRequired: string;
  reasonMinLength: string;
  commentLabel: string;
  commentPlaceholder: string;
  submit: string;
  submittedAt: string;
  approvedAt: string;
  qaApprovedAt: string;
  bulkApprove: (n: number) => string;
  approvedToast: string;
  rejectedToast: string;
  submittedToast: string;
  reasonRequiredToast: string;
  emptyQueue: string;
  emptySubmissions: string;
  parametersTitle: string;
  historyTitle: string;
  reviseAndResubmit: string;
  bulkApproveSelected: string;
  clearSelection: string;
  filterByPriority: string;
  filterBySampleType: string;
  filterByAnalyst: string;
  filterByStage: string;
  allPriorities: string;
  allSampleTypes: string;
  allAnalysts: string;
  allStages: string;
  sortBy: string;
  oldest: string;
  newest: string;
  testLabel: string;
  sampleLabel: string;
  priorityLabel: string;
  analystLabel: string;
  statusLabel: string;
  actionsLabel: string;
  reviewedBy: string;
  decisionLabel: string;
  approvedWord: string;
  rejectedWord: string;
  notFound: string;
  cannotApprove: string;
  cannotReject: string;
  allParametersRequired: string;
  reviewCommentPlaceholder: string;

  // 3-stage specific
  approvalChainTitle: string;
  approvalChainSubtitle: string;
  currentStageLabel: string;
  awaitingYou: string;
  stageDone: string;
  stageNotStarted: string;
  notYourStage: string;
  approveCurrentStage: string;
  approveNextStage: string;
  rejectedByStage: (stage: string) => string;
}

const en: ApprovalLabels = {
  queueTitle: "Test Approval Queue",
  mySubmissionsTitle: "My Test Submissions",
  queueSubtitle: "Review and approve test results submitted by analysts",
  mySubmissionsSubtitle: "Track tests you have submitted for review",

  stageLabSupervisor: "Lab Supervisor",
  stageTechManager: "Technical Manager",
  stageQa: "QA",
  stageApproved: "Approved",

  awaitingLabSupervisor: "Pending Lab Supervisor",
  awaitingTechManager: "Pending Technical Manager",
  awaitingQa: "Pending QA",
  qaApproved: "QA Approved",

  approve: "Approve",
  reject: "Reject",
  reasonLabel: "Reason for rejection",
  reasonPlaceholder: "Explain what needs to be changed (min 5 characters)",
  reasonRequired: "Rejection reason is required",
  reasonMinLength: "Please provide at least 5 characters",
  commentLabel: "Comment (optional)",
  commentPlaceholder: "Additional notes for the analyst",
  submit: "Submit for Review",
  submittedAt: "Submitted",
  approvedAt: "Approved",
  qaApprovedAt: "QA Approved",
  bulkApprove: (n) => `Approve ${n} selected`,
  approvedToast: "Test approved",
  rejectedToast: "Test rejected — sent back to analyst",
  submittedToast: "Test submitted for review",
  reasonRequiredToast: "Please provide a rejection reason",
  emptyQueue: "No tests awaiting review",
  emptySubmissions: "You have no test submissions yet",
  parametersTitle: "Test Parameters",
  historyTitle: "Approval History",
  reviseAndResubmit: "Revise & Resubmit",
  bulkApproveSelected: "Approve Selected",
  clearSelection: "Clear selection",
  filterByPriority: "Priority",
  filterBySampleType: "Sample Type",
  filterByAnalyst: "Analyst",
  filterByStage: "Stage",
  allPriorities: "All priorities",
  allSampleTypes: "All sample types",
  allAnalysts: "All analysts",
  allStages: "All stages",
  sortBy: "Sort",
  oldest: "Oldest first",
  newest: "Newest first",
  testLabel: "Test",
  sampleLabel: "Sample",
  priorityLabel: "Priority",
  analystLabel: "Analyst",
  statusLabel: "Status",
  actionsLabel: "Actions",
  reviewedBy: "Reviewed by",
  decisionLabel: "Decision",
  approvedWord: "Approved",
  rejectedWord: "Rejected",
  notFound: "Test not found",
  cannotApprove: "This test cannot be approved in its current state",
  cannotReject: "This test cannot be rejected in its current state",
  allParametersRequired: "All parameters must have values before submitting",
  reviewCommentPlaceholder: "Optional reviewer comment",

  approvalChainTitle: "Approval Chain",
  approvalChainSubtitle: "Each test must pass through three review stages before release.",
  currentStageLabel: "Current stage",
  awaitingYou: "Awaiting your approval",
  stageDone: "Completed",
  stageNotStarted: "Not started",
  notYourStage: "Not your stage",
  approveCurrentStage: "Approve as current stage",
  approveNextStage: "Advance to next stage",
  rejectedByStage: (stage) => `Rejected by ${stage}`,
};

const ar: ApprovalLabels = {
  queueTitle: "قائمة اعتماد الاختبارات",
  mySubmissionsTitle: "طلبات الاعتماد الخاصة بي",
  queueSubtitle: "مراجعة واعتماد نتائج الاختبارات المقدمة من المحللين",
  mySubmissionsSubtitle: "تتبع الاختبارات التي أرسلتها للمراجعة",

  stageLabSupervisor: "مشرف المختبر",
  stageTechManager: "المدير الفني",
  stageQa: "ضمان الجودة",
  stageApproved: "معتمد",

  awaitingLabSupervisor: "بانتظار مشرف المختبر",
  awaitingTechManager: "بانتظار المدير الفني",
  awaitingQa: "بانتظار ضمان الجودة",
  qaApproved: "معتمد من الجودة",

  approve: "اعتماد",
  reject: "رفض",
  reasonLabel: "سبب الرفض",
  reasonPlaceholder: "اشرح ما يحتاج إلى تغيير (5 أحرف على الأقل)",
  reasonRequired: "سبب الرفض مطلوب",
  reasonMinLength: "يرجى إدخال 5 أحرف على الأقل",
  commentLabel: "تعليق (اختياري)",
  commentPlaceholder: "ملاحظات إضافية للمحلل",
  submit: "إرسال للمراجعة",
  submittedAt: "تم الإرسال",
  approvedAt: "تم الاعتماد",
  qaApprovedAt: "اعتمدت الجودة",
  bulkApprove: (n) => `اعتماد ${n} محدد`,
  approvedToast: "تم اعتماد الاختبار",
  rejectedToast: "تم رفض الاختبار — أُعيد إلى المحلل",
  submittedToast: "تم إرسال الاختبار للمراجعة",
  reasonRequiredToast: "يرجى إدخال سبب الرفض",
  emptyQueue: "لا توجد اختبارات بانتظار المراجعة",
  emptySubmissions: "ليس لديك طلبات اعتماد حالياً",
  parametersTitle: "معاملات الاختبار",
  historyTitle: "سجل الاعتماد",
  reviseAndResubmit: "تعديل وإعادة إرسال",
  bulkApproveSelected: "اعتماد المحدد",
  clearSelection: "إلغاء التحديد",
  filterByPriority: "الأولوية",
  filterBySampleType: "نوع العينة",
  filterByAnalyst: "المحلل",
  filterByStage: "المرحلة",
  allPriorities: "جميع الأولويات",
  allSampleTypes: "جميع أنواع العينات",
  allAnalysts: "جميع المحللين",
  allStages: "جميع المراحل",
  sortBy: "ترتيب",
  oldest: "الأقدم أولاً",
  newest: "الأحدث أولاً",
  testLabel: "الاختبار",
  sampleLabel: "العينة",
  priorityLabel: "الأولوية",
  analystLabel: "المحلل",
  statusLabel: "الحالة",
  actionsLabel: "إجراءات",
  reviewedBy: "تمت المراجعة بواسطة",
  decisionLabel: "القرار",
  approvedWord: "معتمد",
  rejectedWord: "مرفوض",
  notFound: "الاختبار غير موجود",
  cannotApprove: "لا يمكن اعتماد هذا الاختبار في حالته الحالية",
  cannotReject: "لا يمكن رفض هذا الاختبار في حالته الحالية",
  allParametersRequired: "يجب إدخال قيم لجميع المعاملات قبل الإرسال",
  reviewCommentPlaceholder: "تعليق المراجع (اختياري)",

  approvalChainTitle: "سلسلة الاعتماد",
  approvalChainSubtitle: "يجب أن يمر كل اختبار بثلاث مراحل مراجعة قبل الإصدار.",
  currentStageLabel: "المرحلة الحالية",
  awaitingYou: "بانتظار اعتمادك",
  stageDone: "مكتملة",
  stageNotStarted: "لم تبدأ",
  notYourStage: "ليست مرحلتك",
  approveCurrentStage: "اعتماد المرحلة الحالية",
  approveNextStage: "الانتقال إلى المرحلة التالية",
  rejectedByStage: (stage) => `مرفوض من ${stage}`,
};

export const APPROVAL_LABELS: Record<Lang, ApprovalLabels> = { en, ar };

export function approvalLabels(lang: Lang): ApprovalLabels {
  return APPROVAL_LABELS[lang];
}