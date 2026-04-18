import { supabase } from "@/lib/supabaseClient";
import { LoyaltyService } from "./loyaltyService";

// Export the updated MOCK_DEALS so we can fallback to them if the DB is empty or fails
export const MOCK_DEALS = [
  {
    id: "d1",
    title: { ko: "1++ 한우 양지 특수부위 공동구매", en: "A5 Wagyu Beef Brisket - Group Buy" },
    category: "Meat",
    price: "35.50",
    unit: "lb",
    image: "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&q=80",
    currentVol: 85,
    targetVol: 100,
    timeRemaining: { ko: "12시간 남음", en: "12 hours left" },
    statusText: { ko: "목표 85% 달성 (성사 임박!)", en: "85% Reached (Closing Soon!)" },
  },
  {
    id: "d2",
    title: { ko: "제주산 친환경 깐양파 대용량", en: "Jeju Eco-friendly Peeled Onions" },
    category: "Veggie",
    price: "15.00",
    unit: "box",
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=800&q=80",
    currentVol: 300,
    targetVol: 1000,
    timeRemaining: { ko: "2일 남음", en: "2 days left" },
    statusText: { ko: "초과 달성 시 5% 추가 할인 적용", en: "Extra 5% off if target exceeded" },
  },
  {
    id: "d3",
    title: { ko: "이탈리아 직수입 엑스트라 버진 올리브 오일", en: "Imported Italian Extra Virgin Olive Oil" },
    category: "Sauce",
    price: "65.00",
    unit: "carton",
    image: "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=800&q=80",
    currentVol: 10,
    targetVol: 50,
    timeRemaining: { ko: "5일 남음", en: "5 days left" },
    statusText: { ko: "신규 진행중", en: "Newly added" },
  }
];

export class DealService {
  /**
   * Fetches the active group deals from Supabase.
   * If the connection fails or table is empty, falls back to MOCK_DEALS.
   */
  static async getActiveDeals(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("VANGUARD: DB warning. Falling back to MOCK_DEALS.", error);
        return MOCK_DEALS;
      }

      if (!data || data.length === 0) {
        console.warn("VANGUARD: DB is empty. Serving MOCK_DEALS for preview.");
        return MOCK_DEALS;
      }

      // Map DB structure to frontend structure. 
      // Assuming DB has: item_name, item_name_en, price_per_unit, unit, current_volume, target_volume
      return data.map((deal: any) => ({
        id: deal.id,
        title: { 
          ko: deal.item_name, 
          en: deal.item_name_en || deal.item_name 
        },
        category: deal.category || "General",
        price: Number(deal.price_per_unit).toFixed(2),
        unit: deal.unit,
        image: deal.image_url || "https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&q=80",
        currentVol: deal.current_volume,
        targetVol: deal.target_volume,
        timeRemaining: { 
          ko: "진행중", 
          en: "Active" 
        }, // Real logic would format expires_at
        statusText: { 
          ko: "참여 가능", 
          en: "Available" 
        }
      }));

    } catch (e) {
      console.warn("VANGUARD: Expected DB connection error in Mock Mode. Falling back to MOCK_DEALS.");
      return MOCK_DEALS;
    }
  }

  /**
   * Records a user's participation in a deal and updates the current volume.
   */
  static async joinDeal(dealId: string, additionalVolume: number): Promise<{ success: boolean; newVolume?: number; error?: any }> {
    try {
      // 1. In a mock scenario where dealId is from the hardcoded MOCK_DEALS
      if (dealId === 'd1' || dealId === 'd2' || dealId === 'd3') {
         await new Promise(r => setTimeout(r, 600));
         return { success: true };
      }

      const { data: { user } } = await supabase.auth.getUser();

      // 2. Real DB execution
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('current_volume, target_volume, item_name, price_per_unit, supplier_id, suppliers(name, email)')
        .eq('id', dealId)
        .single();
        
      if (!currentDeal) return { success: false, error: "Deal not found" };

      const newVolume = currentDeal.current_volume + additionalVolume;
      const totalAmount = additionalVolume * currentDeal.price_per_unit;

      const { data, error } = await supabase
        .from('deals')
        .update({ 
          current_volume: newVolume,
          status: newVolume >= currentDeal.target_volume ? 'completed' : 'active'
        })
        .eq('id', dealId)
        .select('current_volume')
        .single();

      if (error) throw error;
      
      // 3. Register real order in the ledger
      if (user) {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_amount: totalAmount,
            status: newVolume >= currentDeal.target_volume ? 'dispatched' : 'pending'
          })
          .select('id')
          .single();
        
        if (!orderError && orderData) {
          await supabase.from('order_items').insert({
            order_id: orderData.id,
            supplier_id: currentDeal.supplier_id,
            product_name: currentDeal.item_name,
            quantity: String(additionalVolume),
            price: currentDeal.price_per_unit
          });
          
          // Apply Trust Engine rewards
          await LoyaltyService.grantTransactionReward(user.id, totalAmount);
        }
      }

      // 4. If target volume met in this transaction, simulate Vendor Dispatch
      if (currentDeal.current_volume < currentDeal.target_volume && newVolume >= currentDeal.target_volume) {
        const supplierInfo = Array.isArray(currentDeal.suppliers) ? currentDeal.suppliers[0] : currentDeal.suppliers;
        
        try {
          await fetch('/api/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dealId: dealId,
              itemName: currentDeal.item_name,
              totalVolume: newVolume,
              supplierName: supplierInfo?.name || "Vanguard Partner",
              supplierEmail: supplierInfo?.email || "orders@vanguard.test"
            })
          });
        } catch (dispatchErr) {
          console.warn("VANGUARD: Dispatch API call failed (client-side simulation error)", dispatchErr);
        }
      }

      return { success: true, newVolume: data.current_volume };

    } catch (e) {
      console.error("VANGUARD: Failed to join deal.", e);
      return { success: false, error: e };
    }
  }
}
