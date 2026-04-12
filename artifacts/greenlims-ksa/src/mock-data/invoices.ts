export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  sampleId: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vat: number;
  total: number;
  status: 'Draft' | 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
  vatNo: string;
  qrCode: string;
  // ZATCA Fields
  uuid: string;
  invoiceType: 'Tax Invoice' | 'Simplified Tax Invoice';
  hash: string;
  isReported: boolean;
}

export const mockInvoices: Invoice[] = [
  {
    id: "INV-2024-0001",
    clientId: "C001",
    clientName: "Al-Marai Company",
    sampleId: "SAM-2024-001",
    issueDate: "2024-01-15",
    dueDate: "2024-02-15",
    subtotal: 500.00,
    vat: 75.00,
    total: 575.00,
    status: "Paid",
    vatNo: "300012345600003",
    qrCode: "MOCKED_BASE64_QR_DATA",
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    invoiceType: "Tax Invoice",
    hash: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f",
    isReported: true
  },
  {
    id: "INV-2024-0002",
    clientId: "C007",
    clientName: "SWCC - Saline Water",
    sampleId: "SAM-2024-002",
    issueDate: "2024-01-16",
    dueDate: "2024-02-16",
    subtotal: 1200.00,
    vat: 180.00,
    total: 1380.00,
    status: "Pending",
    vatNo: "300098765400003",
    qrCode: "MOCKED_BASE64_QR_DATA",
    uuid: "b2c12345-e29b-41d4-a716-446655440001",
    invoiceType: "Tax Invoice",
    hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4",
    isReported: false
  },
  {
    id: "INV-2024-0003",
    clientId: "C003",
    clientName: "Ajmal Perfumes",
    sampleId: "SAM-2024-003",
    issueDate: "2024-01-17",
    dueDate: "2024-02-17",
    subtotal: 800.00,
    vat: 120.00,
    total: 920.00,
    status: "Overdue",
    vatNo: "300055443300003",
    qrCode: "MOCKED_BASE64_QR_DATA",
    uuid: "a1b2c3d4-e29b-41d4-a716-446655440002",
    invoiceType: "Simplified Tax Invoice",
    hash: "sha256:9c8e1d5a7b3c4e2f1a6d8b0c9f7a5e4d2b1c3a0",
    isReported: true
  }
];
