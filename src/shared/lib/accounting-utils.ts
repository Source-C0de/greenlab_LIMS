/**
 * ZatcaService - Mock service for ZATCA FATOORA compliance requirements.
 * Simulates hashing, signing, and QR code generation for Phase 1 & 2.
 */
export class ZatcaService {
  /**
   * Generates a mock QR code in Base64 (Simulating TLV format for ZATCA)
   */
  static generateQR(invoice: any): string {
    const tlvData = `Seller: GreenLabLIMS KSA | VAT: 300012345600003 | Date: ${invoice.issueDate} | Total: ${invoice.total} | VAT Total: ${invoice.vat}`;
    return btoa(tlvData);
  }

  /**
   * Generates a mock Hash (SHA-256 simulation) for Phase 2
   */
  static generateHash(invoice: any): string {
    return `sha256:${Math.random().toString(16).slice(2, 42)}`;
  }

  /**
   * Simulates reporting an invoice to ZATCA via API
   */
  static async reportToZatca(invoice: any): Promise<{ success: boolean; irn?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          irn: `ZATCA-IRN-${Math.random().toString(36).toUpperCase().slice(2, 10)}`
        });
      }, 1500);
    });
  }
}

/**
 * AccountingEngine - Core logic for automated double-entry postings.
 */
export class AccountingEngine {
  /**
   * Generates journal entries from an invoice
   */
  static postInvoice(invoice: any) {
    return {
      id: `JE-AUTO-${Date.now()}`,
      date: invoice.issueDate,
      reference: invoice.id,
      description: `Sales Invoice - ${invoice.clientName}`,
      lines: [
        { accountId: "ACC-003", accountName: "Accounts Receivable", debit: invoice.total, credit: 0 },
        { accountId: "ACC-011", accountName: "Lab Testing Services", debit: 0, credit: invoice.subtotal },
        { accountId: "ACC-007", accountName: "Output VAT (15%)", debit: 0, credit: invoice.vat },
      ],
      status: "Posted",
      sourceType: "Invoice"
    };
  }

  /**
   * Generates journal entries from a payment
   */
  static postPayment(invoice: any, amount: number) {
    return {
      id: `JE-PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      reference: invoice.id,
      description: `Payment Receipt - ${invoice.clientName}`,
      lines: [
        { accountId: "ACC-002", accountName: "Al-Rajhi Bank - Main", debit: amount, credit: 0 },
        { accountId: "ACC-003", accountName: "Accounts Receivable", debit: 0, credit: amount },
      ],
      status: "Posted",
      sourceType: "Payment"
    };
  }
}
