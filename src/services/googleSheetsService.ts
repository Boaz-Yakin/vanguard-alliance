/**
 * Google Sheets Integration Service
 * Strategically routes data to different sheets for maximum business intelligence.
 */
export const GoogleSheetsService = {
  /**
   * Generic method to log data to a specific sheet
   */
  async logData(sheetName: string, data: any) {
    try {
      await fetch("/api/sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sheetName,
          timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'America/New_York' }),
          ...data
        }),
      });
      console.log(`[GoogleSheetsService] Data logged to ${sheetName}`);
    } catch (error) {
      console.error(`[GoogleSheetsService] Error logging to ${sheetName}:`, error);
    }
  },

  /**
   * Log Transaction / Participation (Orders)
   */
  async logTransaction(data: {
    userId: string;
    email: string;
    storeName: string;
    phone: string;
    item: string;
    qty: number;
    amount: number;
    pdfUrl?: string;
    pdfBase64?: string;
    pdfName?: string;
  }) {
    // 키 이름을 시트 헤더와 매칭하기 좋게 구성
    return this.logData("Transactions", {
      "User ID": data.userId,
      "Email": data.email,
      "Store Name": data.storeName,
      "Phone": data.phone,
      "Item": data.item,
      "Qty": data.qty,
      "Amount": data.amount,
      "Invoice PDF": data.pdfUrl,
      "pdfBase64": data.pdfBase64, // Apps Script에서 처리함
      "pdfName": data.pdfName
    });
  },

  /**
   * Log User Information (New/Existing)
   */
  async logUser(data: {
    userId: string;
    email: string;
    storeName: string;
    phone: string;
    address?: string;
    taxId?: string;
  }) {
    return this.logData("Users", {
      "User ID": data.userId,
      "Email": data.email,
      "Store Name": data.storeName,
      "Phone": data.phone,
      "Address": data.address,
      "Tax ID": data.taxId
    });
  },

  /**
   * Log Deal/Event Information
   */
  async logDeal(data: {
    dealId: string;
    itemName: string;
    category: string;
    price: number;
    targetVolume: number;
    currentVolume: number;
    status: string;
    expiresAt: string;
    isPrivate: boolean;
  }) {
    return this.logData("Deals", {
      "Deal ID": data.dealId,
      "Item Name": data.itemName,
      "Category": data.category,
      "Price": data.price,
      "Target Volume": data.targetVolume,
      "Current Volume": data.currentVolume,
      "Status": data.status,
      "Expires At": data.expiresAt,
      "Is Private": data.isPrivate
    });
  },

  /**
   * Log Order Cancellation
   */
  async logCancellation(data: {
    orderId: string;
    userId: string;
    email: string;
    storeName: string;
    phone: string;
    item: string;
    qty: number;
    amount: number;
  }) {
    return this.logData("Transactions", {
      "User ID": data.userId,
      "Email": data.email,
      "Order ID": data.orderId,
      "Store Name": data.storeName,
      "Phone": data.phone,
      "Item": data.item,
      "Qty": -data.qty, // Negative quantity for cancellation
      "Amount": -data.amount, // Negative amount for cancellation
      "Status": "CANCELLED"
    });
  }
};
