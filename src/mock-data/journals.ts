export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  status: 'Draft' | 'Posted' | 'Cancelled';
  sourceType: 'Invoice' | 'Payment' | 'Expense' | 'Manual';
}

export const mockJournals: JournalEntry[] = [
  {
    id: "JE-2024-001",
    date: "2024-01-15",
    reference: "INV-2024-0001",
    description: "Revenue recognition for Milk Analysis",
    status: "Posted",
    sourceType: "Invoice",
    lines: [
      { accountId: "ACC-003", accountCode: "1201", accountName: "Accounts Receivable", debit: 575.00, credit: 0 },
      { accountId: "ACC-011", accountCode: "4101", accountName: "Lab Testing Services", debit: 0, credit: 500.00 },
      { accountId: "ACC-007", accountCode: "2201", accountName: "Output VAT (15%)", debit: 0, credit: 75.00 },
    ]
  },
  {
    id: "JE-2024-002",
    date: "2024-01-16",
    reference: "EXP-2024-001",
    description: "Purchase of lab reagents",
    status: "Posted",
    sourceType: "Expense",
    lines: [
      { accountId: "ACC-013", accountCode: "5101", accountName: "Reagent & Supplies Expense", debit: 1000.00, credit: 0 },
      { accountId: "ACC-005", accountCode: "1401", accountName: "Input VAT (15%)", debit: 150.00, credit: 0 },
      { accountId: "ACC-002", accountCode: "1102", accountName: "Al-Rajhi Bank - Main", debit: 0, credit: 1150.00 },
    ]
  },
  {
    id: "JE-2024-003",
    date: "2024-01-17",
    reference: "INV-2024-0001",
    description: "Payment received for invoice INV-2024-0001",
    status: "Posted",
    sourceType: "Payment",
    lines: [
      { accountId: "ACC-002", accountCode: "1102", accountName: "Al-Rajhi Bank - Main", debit: 575.00, credit: 0 },
      { accountId: "ACC-003", accountCode: "1201", accountName: "Accounts Receivable", debit: 0, credit: 575.00 },
    ]
  }
];
