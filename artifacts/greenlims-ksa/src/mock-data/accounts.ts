export interface Account {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
  balance: number;
}

export const mockAccounts: Account[] = [
  // ASSETS
  { id: "ACC-001", code: "1101", name: "Cash on Hand", nameAr: "النقدية بالصندوق", type: "Asset", category: "Cash", balance: 15420.50 },
  { id: "ACC-002", code: "1102", name: "Al-Rajhi Bank - Main", nameAr: "مصرف الراجحي - الحساب الرئيسي", type: "Asset", category: "Bank", balance: 425800.00 },
  { id: "ACC-003", code: "1201", name: "Accounts Receivable", nameAr: "حسابات العملاء المدينين", type: "Asset", category: "Receivables", balance: 89600.00 },
  { id: "ACC-004", code: "1301", name: "Lab Equipment", nameAr: "معدات المختبر", type: "Asset", category: "Fixed Assets", balance: 250000.00 },
  { id: "ACC-005", code: "1401", name: "Input VAT (15%)", nameAr: "ضريبة القيمة المضافة للمدخلات", type: "Asset", category: "Tax", balance: 12450.00 },

  // LIABILITIES
  { id: "ACC-006", code: "2101", name: "Accounts Payable", nameAr: "حسابات الموردين الدائنين", type: "Liability", category: "Payables", balance: 45200.00 },
  { id: "ACC-007", code: "2201", name: "Output VAT (15%)", nameAr: "ضريبة القيمة المضافة للمخرجات", type: "Liability", category: "Tax", balance: 34100.00 },
  { id: "ACC-008", code: "2301", name: "Accrued Salaries", nameAr: "الرواتب المستحقة", type: "Liability", category: "Accruals", balance: 120000.00 },

  // EQUITY
  { id: "ACC-009", code: "3101", name: "Initial Capital", nameAr: "رأس المال", type: "Equity", category: "Capital", balance: 500000.00 },
  { id: "ACC-010", code: "3201", name: "Retained Earnings", nameAr: "الأرباح المبقاة", type: "Equity", category: "Earnings", balance: 87970.50 },

  // REVENUE
  { id: "ACC-011", code: "4101", name: "Lab Testing Services", nameAr: "إيرادات خدمات فحص المختبر", type: "Revenue", category: "Sales", balance: 215400.00 },
  { id: "ACC-012", code: "4201", name: "Consultancy Income", nameAr: "إيرادات استشارية", type: "Revenue", category: "Other Income", balance: 45000.00 },

  // EXPENSES
  { id: "ACC-013", code: "5101", name: "Reagent & Supplies Expense", nameAr: "مصروفات الكواشف والمواد", type: "Expense", category: "Direct Costs", balance: 32400.00 },
  { id: "ACC-014", code: "5201", name: "Staff Salaries", nameAr: "رواتب الموظفين", type: "Expense", category: "Operating Expenses", balance: 85000.00 },
  { id: "ACC-015", code: "5301", name: "Rent & Utilities", nameAr: "الإيجار والمرافق", type: "Expense", category: "Operating Expenses", balance: 22000.00 },
];
