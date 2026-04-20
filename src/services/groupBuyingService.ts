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
  pricePerUnit: number;
  is_private?: boolean; // Elite Only
  imageUrl?: string;
  tiers: DiscountTier[];
}

export const GroupBuyingService = {
  /**
   * Fetch active alliance deals from DB with Fallback
   */
  async getActiveDeals(trustScore: number = 0): Promise<AllianceDeal[]> {
    // 1. Attempt to fetch from real Supabase 'deals' table
    const { data: dbDeals, error } = await supabase
      .from('deals')
      .select('*, suppliers(name), deal_tiers(*)')
      .eq('is_private', true);

    let deals: AllianceDeal[] = [];

    if (dbDeals && dbDeals.length > 0) {
      deals = dbDeals.map((d: any) => ({
        id: d.id,
        itemName: d.item_name,
        currentVolume: d.current_volume,
        targetVolume: d.target_volume,
        status: d.status,
        supplierName: d.suppliers?.name || "Premium Supplier",
        expiresIn: this.formatExpiry(d.expires_at),
        pricePerUnit: d.price_per_unit,
        is_private: d.is_private,
        imageUrl: d.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=300", // Fallback fresh produce image
        tiers: d.deal_tiers?.map((t: any) => ({ threshold: t.threshold_pct, rate: t.discount_rate })) || []
      }));
    } else {
      // 2. Tactical Fallback (Prototype Mode)
      deals = [
        {
          id: "deal_onion_01",
          itemName: "Yellow Onions",
          currentVolume: 850,
          targetVolume: 1000,
          status: "active",
          supplierName: "Green Harvest Produce",
          expiresIn: "4:20:15",
          pricePerUnit: 1.45,
          tiers: [
            { threshold: 0.3, rate: 0.05 },
            { threshold: 0.7, rate: 0.10 },
            { threshold: 1.0, rate: 0.15 }
          ]
        },
        {
          id: "deal_beef_01",
          itemName: "Wagyu Beef",
          currentVolume: 420,
          targetVolume: 500,
          status: "active",
          supplierName: "Vanguard Premium Meats",
          expiresIn: "1:45:00",
          pricePerUnit: 24.99,
          tiers: [
            { threshold: 0.2, rate: 0.05 },
            { threshold: 0.5, rate: 0.12 },
            { threshold: 1.0, rate: 0.20 }
          ]
        },
        {
          id: "deal_elite_01",
          itemName: "Black Truffle Oil",
          currentVolume: 65,
          targetVolume: 100,
          status: "active",
          supplierName: "Elite Global Imports",
          expiresIn: "0:55:00",
          pricePerUnit: 120.00,
          is_private: true, // Requires Trust Score 7.0+
          tiers: [
            { threshold: 0.5, rate: 0.15 },
            { threshold: 1.0, rate: 0.30 }
          ]
        }
      ];
    }

    // Filter deals based on trust score
    return deals.filter(d => !d.is_private || trustScore >= 7.0);
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
