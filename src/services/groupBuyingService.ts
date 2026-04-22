import { supabase } from "@/lib/supabaseClient";

export interface DiscountTier {
  threshold: number; // 0.0 to 1.0 (percentage)
  rate: number;      // discount rate
}

export interface AllianceDeal {
  id: string;
  itemName: string;
  currentVolume: number;
  targetVolume: number;
  status: "active" | "completed";
  supplierName: string;
  expiresIn: string;
  expiresAt: string; // ISO string for client-side countdown
  pricePerUnit: number;
  is_private?: boolean;
  imageUrl?: string;
  tiers: DiscountTier[];
}

export const GroupBuyingService = {
  /**
   * Fetch active alliance deals from DB. 
   * returns empty array if no deals exist.
   */
  async getActiveDeals(trustScore: number = 0): Promise<AllianceDeal[]> {
    console.log("[VANGUARD] Fetching active alliance deals...");
    const { data: dbDeals, error } = await supabase
      .from('deals')
      .select('*, suppliers(name), deal_tiers(*)')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
       console.error("[VANGUARD] DB Error in GroupBuyingService:", error);
       return [];
    }

    console.log(`[VANGUARD] Found ${dbDeals?.length || 0} deals in DB.`);

    if (!dbDeals || dbDeals.length === 0) {
       return [];
    }

    const deals: AllianceDeal[] = dbDeals.map((d: any) => ({
      id: d.id,
      itemName: d.item_name,
      currentVolume: Number(d.current_volume),
      targetVolume: Number(d.target_volume),
      status: d.status,
      supplierName: d.suppliers?.name || "Alliance Supplier",
      expiresIn: this.formatExpiry(d.expires_at),
      expiresAt: d.expires_at,
      pricePerUnit: Number(d.price_per_unit),
      is_private: d.is_private,
      imageUrl: d.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=300",
      tiers: d.deal_tiers?.map((t: any) => ({ threshold: t.threshold_pct, rate: t.discount_rate })) || []
    }));

    // DEVELOPER OVERRIDE: Temporarily show all deals regardless of trust score for verification
    return deals;
  },

  formatExpiry(dateStr: string): string {
    const end = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${mins}:00`;
  },

  getCurrentDiscountRate(deal: AllianceDeal): number {
    if (!deal.tiers || !Array.isArray(deal.tiers)) return 0;
    const progress = deal.currentVolume / deal.targetVolume;
    let applicableRate = 0;
    const sortedTiers = [...deal.tiers].sort((a,b) => a.threshold - b.threshold);
    for (const tier of sortedTiers) {
      if (progress >= tier.threshold) applicableRate = tier.rate;
    }
    return applicableRate;
  },

  async calculatePotentialSavings(items: { name: string, quantity: string }[], trustScore: number = 0): Promise<number> {
    const deals = await this.getActiveDeals(trustScore);
    let totalSavings = 0;
    items.forEach(item => {
      const match = deals.find(d => item.name.toLowerCase().includes(d.itemName.toLowerCase().split(' ')[0]));
      if (match) {
        const qtyNum = parseFloat(item.quantity) || 0;
        const currentRate = this.getCurrentDiscountRate(match);
        totalSavings += (qtyNum * match.pricePerUnit) * currentRate;
      }
    });
    return totalSavings;
  }
};
