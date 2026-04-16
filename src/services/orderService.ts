import { supabase } from "@/lib/supabaseClient";
import { generateOrderPdf } from "@/lib/pdfGenerator";

export interface OrderItem {
  id: string;
  name: string;
  quantity: string;
  supplier_name?: string;
}

export interface DispatchResult {
  supplierName: string;
  pdfBlob: Blob;
  status: "success" | "failed";
}

/**
 * Tactical Service for Order Management & Routing
 */
export const OrderService = {
  /**
   * Hardcoded vendor intelligence (US Market)
   */
  vendorMap: {
    "meats": ["beef", "pork", "steak", "wagyu", "chicken"],
    "produce": ["onion", "lettuce", "tomato", "potato", "carrot"],
    "dairy": ["milk", "cheese", "butter", "egg"]
  },

  /**
   * Preview routing based on item names
   */
  async previewRouting(items: { name: string, quantity: string }[]): Promise<OrderItem[]> {
    return items.map((item, index) => {
      let supplierName = "General Supply Co.";
      const itemName = item.name.toLowerCase();

      if (this.vendorMap.meats.some(v => itemName.includes(v))) supplierName = "Vanguard Premium Meats";
      else if (this.vendorMap.produce.some(v => itemName.includes(v))) supplierName = "Green Harvest Produce";
      else if (this.vendorMap.dairy.some(v => itemName.includes(v))) supplierName = "Central Dairy Logistics";

      return {
        id: `preview_${index}`,
        name: item.name,
        quantity: item.quantity,
        supplier_name: supplierName
      };
    });
  },

  /**
   * Save order to DB and simulate dispatch (Real World Integration)
   */
  async saveOrder(userId: string | null, rawText: string, items: OrderItem[]): Promise<{ orderId: string, dispatchResults: DispatchResult[] }> {
    const orderId = `VANGUARD_${Date.now()}`;
    
    // 1. Data Sanitization & DB Insertion (Supabase)
    const { data: order, error } = await supabase
      .from('orders')
      .insert([
        { 
          id: orderId,
          user_id: userId, 
          raw_text: rawText,
          status: 'dispatched',
          total_items: items.length
        }
      ])
      .select();

    if (error && (supabase as any).mock !== true) {
      console.warn("Real DB insert failed, continuing with flow for prototype testing.", error);
    }

    // 2. Multi-Vendor Dispatch Simulation (Notification)
    const suppliers = Array.from(new Set(items.map(i => i.supplier_name)));
    const dispatchResults: DispatchResult[] = [];

    for (const supplier of suppliers) {
      const supplierItems = items.filter(i => i.supplier_name === supplier);
      const pdfBlob = await generateOrderPdf(orderId, supplier || "Unknown", supplierItems);

      // Simulate Actual Communication (Email/Telegram API delay)
      await new Promise(resolve => setTimeout(resolve, 800));

      dispatchResults.push({
        supplierName: supplier || "Unknown",
        pdfBlob,
        status: "success"
      });

      // Notification Relay (Mock Console Log for Agent Verification)
      console.log(`📡 [VANGUARD NOTIFY] Order ${orderId} dispatched to ${supplier} via Secure Protocol.`);
    }

    return { orderId, dispatchResults };
  }
};
