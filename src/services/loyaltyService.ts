import { supabase } from "@/lib/supabaseClient";

/**
 * Vanguard Special: Loyalty & Trust Score Engine
 */
export const LoyaltyService = {
  /**
   * Points calculation: $1 = 1 Point. Bonus multiplier applied based on volume.
   */
  calculatePoints(totalAmount: number): number {
    let multiplier = 1.0;
    if (totalAmount > 500) multiplier = 1.2;
    if (totalAmount > 2000) multiplier = 1.5;
    
    return Math.floor(totalAmount * multiplier);
  },

  /**
   * Trust Score dynamic adjustment based on order volume.
   * Trust Score dictates access to 'Elite' deals.
   */
  calculateTrustBoost(totalAmount: number): number {
    if (totalAmount < 50) return 0.01;
    if (totalAmount < 200) return 0.05;
    if (totalAmount < 1000) return 0.15;
    return 0.3; // High trust earned via bulk purchasing
  },

  /**
   * Process transaction rewards: Points & Trust Score update
   */
  async grantTransactionReward(userId: string, totalAmount: number): Promise<{ newLevel: number, newTrust: number } | null> {
    const pointsToAdd = this.calculatePoints(totalAmount);
    const trustBoost = this.calculateTrustBoost(totalAmount);

    const { data: profile } = await supabase
      .from("profiles")
      .select("points, trust_score, level")
      .eq("id", userId)
      .single();

    if (!profile) return null;

    const newPoints = (profile.points || 0) + pointsToAdd;
    let newScore = Number(profile.trust_score || 0) + trustBoost;
    if (newScore > 9.9) newScore = 9.9; // Max trust cap until manual KYC
    if (newScore > 10.0) newScore = 10.0;

    // Tactical Level Progression Logic
    let newLevel = profile.level || 1;
    if (newPoints > 500 && newLevel === 1) newLevel = 2; // Bronze
    if (newPoints > 2500 && newLevel === 2) newLevel = 3; // Silver
    if (newPoints > 10000 && newLevel === 3) newLevel = 4; // Gold
    if (newPoints > 50000 && newLevel === 4) newLevel = 5; // Vanguard Elite

    await supabase
      .from("profiles")
      .update({ 
        points: newPoints, 
        trust_score: newScore,
        level: newLevel
      })
      .eq("id", userId);

    return { newLevel, newTrust: newScore };
  }
};
