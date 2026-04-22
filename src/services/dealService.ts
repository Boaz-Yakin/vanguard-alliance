import { supabase } from "@/lib/supabaseClient";
import { LoyaltyService } from "./loyaltyService";

export interface DealTierInput {
  threshold_pct: number;
  discount_rate: number;
}

export interface CreateDealInput {
  item_name: string;
  item_name_en: string;
  category: string;
  price_per_unit: number;
  unit: string;
  image_url: string;
  target_volume: number;
  supplier_id: string;
  expires_at: string;
  is_private?: boolean;
  tiers: DealTierInput[];
}

export class DealService {
  /**
   * Strategically inserts a new alliance deal into the system.
   */
  static async createDeal(input: CreateDealInput): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          item_name: input.item_name,
          item_name_en: input.item_name_en,
          category: input.category,
          price_per_unit: input.price_per_unit,
          unit: input.unit,
          image_url: input.image_url,
          target_volume: input.target_volume,
          supplier_id: input.supplier_id,
          expires_at: input.expires_at,
          is_private: input.is_private || false,
          current_volume: 0,
          status: 'active'
        })
        .select()
        .single();

      if (dealError) throw dealError;

      if (input.tiers && input.tiers.length > 0) {
        const tiersWithId = input.tiers.map(t => ({
          deal_id: deal.id,
          threshold_pct: t.threshold_pct,
          discount_rate: t.discount_rate
        }));

        const { error: tiersError } = await supabase
          .from('deal_tiers')
          .insert(tiersWithId);

        if (tiersError) throw tiersError;
      }

      return { success: true, data: deal };
    } catch (e) {
      console.error("VANGUARD: Failed to create strategic deal.", e);
      return { success: false, error: e };
    }
  }

  /**
   * Fetches the active group deals from Supabase.
   */
  static async getActiveDeals(includePrivate: boolean = true): Promise<any[]> {
    try {
      console.log("[VANGUARD] Fetching active regular deals...");
      let query = supabase
        .from('deals')
        .select('*, deal_tiers(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("[VANGUARD] DB error in DealService:", error);
        return [];
      }

      console.log(`[VANGUARD] DealService found ${data?.length || 0} items.`);

      if (!data || data.length === 0) {
        return [];
      }

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
        expiresAt: deal.expires_at,
        timeRemaining: { 
          ko: "진행중", 
          en: "Active" 
        },
        statusText: { 
          ko: deal.is_private ? "엘리트 전용" : "참여 가능", 
          en: deal.is_private ? "Elite Only" : "Available" 
        },
        is_private: deal.is_private,
        tiers: deal.deal_tiers?.map((t: any) => ({
          threshold: t.threshold_pct,
          rate: t.discount_rate
        })) || []
      }));

    } catch (e) {
      console.error("VANGUARD: Critical failure in DealService", e);
      return [];
    }
  }

  /**
   * Admin only: Fetches ALL deals including private ones.
   */
  static async getAllDeals(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, suppliers(name), deal_tiers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (e) {
      console.error("VANGUARD: Failed to fetch all deals for admin.", e);
      return [];
    }
  }

  /**
   * Strategically eliminates a deal from the system.
   */
  static async deleteDeal(dealId: string): Promise<{ success: boolean; error?: any }> {
    try {
      // 1. Delete associated tiers first (if not cascading)
      const { error: tierError } = await supabase
        .from('deal_tiers')
        .delete()
        .eq('deal_id', dealId);
      
      if (tierError) throw tierError;

      // 2. Delete the deal itself
      const { error: dealError } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);
      
      if (dealError) {
        // Fallback: If hard delete fails (e.g. foreign key constraint), mark as archived
        const { error: updateError } = await supabase
          .from('deals')
          .update({ status: 'archived' })
          .eq('id', dealId);
        
        if (updateError) throw updateError;
        return { success: true, method: 'archived' };
      }

      return { success: true, method: 'deleted' };
    } catch (e: any) {
      console.error("VANGUARD: Failed to terminate deal.", e);
      return { success: false, error: e?.message || "Unknown error" };
    }
  }

  /**
   * Admin only: Updates an existing deal.
   */
  static async updateDeal(dealId: string, input: CreateDealInput): Promise<{ success: boolean; error?: any }> {
    try {
      const { error: dealError } = await supabase
        .from('deals')
        .update({
          item_name: input.item_name,
          item_name_en: input.item_name_en,
          category: input.category,
          price_per_unit: input.price_per_unit,
          unit: input.unit,
          image_url: input.image_url,
          target_volume: input.target_volume,
          supplier_id: input.supplier_id,
          expires_at: input.expires_at,
          is_private: input.is_private
        })
        .eq('id', dealId);

      if (dealError) throw dealError;

      await supabase.from('deal_tiers').delete().eq('deal_id', dealId);

      if (input.tiers && input.tiers.length > 0) {
        const tiersWithId = input.tiers.map(t => ({
          deal_id: dealId,
          threshold_pct: t.threshold_pct,
          discount_rate: t.discount_rate
        }));

        const { error: tiersError } = await supabase
          .from('deal_tiers')
          .insert(tiersWithId);

        if (tiersError) throw tiersError;
      }

      return { success: true };
    } catch (e) {
      console.error("VANGUARD: Failed to update deal.", e);
      return { success: false, error: e };
    }
  }

  /**
   * Fetches a single deal by its ID.
   */
  static async getDealById(dealId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, suppliers(name, email), deal_tiers(*)')
        .eq('id', dealId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        title: { ko: data.item_name, en: data.item_name_en },
        unit: data.unit,
        targetVol: data.target_volume,
        currentVol: data.current_volume,
        image_url: data.image_url,
        supplierName: data.suppliers?.name,
        supplierEmail: data.suppliers?.email,
        tiers: data.deal_tiers
      };
    } catch (e) {
      console.error("VANGUARD: Failed to fetch single deal.", e);
      return null;
    }
  }

  /**
   * Records a user's participation in a deal and updates the current volume.
   */
  static async joinDeal(dealId: string, additionalVolume: number): Promise<{ success: boolean; newVolume?: number; error?: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let { data: currentDeal } = await supabase
        .from('deals')
        .select('current_volume, target_volume, item_name, price_per_unit, supplier_id, suppliers(name, email)')
        .eq('id', dealId)
        .single();
        
      if (!currentDeal) return { success: false, error: "Deal not found." };

      const newVolume = Number(currentDeal.current_volume) + additionalVolume;
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
        
        if (orderError) throw orderError;

        if (orderData) {
          const { error: itemsError } = await supabase.from('order_items').insert({
            order_id: orderData.id,
            supplier_id: currentDeal.supplier_id,
            product_name: currentDeal.item_name,
            quantity: String(additionalVolume),
            price: currentDeal.price_per_unit
          });
          
          if (itemsError) throw itemsError;
          await LoyaltyService.grantTransactionReward(user.id, totalAmount);
        }
      }

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
          console.warn("VANGUARD: Dispatch API call failed", dispatchErr);
        }
      }

      return { success: true, newVolume: data.current_volume };
    } catch (e) {
      console.error("VANGUARD: Failed to join deal.", e);
      return { success: false, error: e };
    }
  }
}
