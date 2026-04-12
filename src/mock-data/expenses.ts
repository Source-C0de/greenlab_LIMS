export interface Expense {
  id: string;
  vendorName: string;
  category: string;
  date: string;
  amount: number;
  vat: number;
  total: number;
  status: 'Draft' | 'Approved' | 'Paid';
  paymentMethod: string;
  reference: string;
}

export const mockExpenses: Expense[] = [
  {
    id: "EXP-2024-001",
    vendorName: "Sigma-Aldrich KSA",
    category: "Reagents",
    date: "2024-01-16",
    amount: 1000.00,
    vat: 150.00,
    total: 1150.00,
    status: "Paid",
    paymentMethod: "Bank Transfer",
    reference: "PO-98212"
  },
  {
    id: "EXP-2024-002",
    vendorName: "Saudi Electricity Company",
    category: "Utilities",
    date: "2024-01-20",
    amount: 4500.00,
    vat: 675.00,
    total: 5175.00,
    status: "Approved",
    paymentMethod: "Direct Debit",
    reference: "BILL-JAN-24"
  },
  {
    id: "EXP-2024-003",
    vendorName: "Aramex",
    category: "Logistics",
    date: "2024-01-22",
    amount: 250.00,
    vat: 37.50,
    total: 287.50,
    status: "Paid",
    paymentMethod: "Cash on Delivery",
    reference: "TRK-00982"
  }
];
