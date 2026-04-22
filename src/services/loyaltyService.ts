import { supabase } from "@/lib/supabaseClient";
import { LOYALTY_CONFIG } from "@/config/loyaltyConfig";

/**
 * Generic Loyalty & Trust Score Engine
 * Decoupled from hardcoded domain logic.
 */
export const LoyaltyService = {
  /**
   * Get user profile (points, trust_score, level)
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("points, trust_score, level")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("[VANGUARD] Error fetching profile:", error);
      return null;
    }
    return data;
  },

  /**
   * Points calculation based on configurable thresholds.
   */
  calculatePoints(totalAmount: number): number {
    const { baseRate, thresholds } = LOYALTY_CONFIG.points;
    let multiplier = baseRate;

    // Find the highest applicable multiplier
    for (const threshold of thresholds) {
      if (totalAmount > threshold.minAmount) {
        multiplier = threshold.multiplier;
      }
    }
    
    return Math.floor(totalAmount * multiplier);
  },

  /**
   * Trust Score adjustment based on configurable boosts.
   */
  calculateTrustBoost(totalAmount: number): number {
    const { boosts } = LOYALTY_CONFIG.trust;
    
    for (const boostRule of boosts) {
      if ('maxAmount' in boostRule && typeof boostRule.maxAmount === 'number' && totalAmount < boostRule.maxAmount) {
        return boostRule.boost;
      }
      if ('defaultBoost' in boostRule && typeof boostRule.defaultBoost === 'number') {
        return boostRule.defaultBoost;
      }
    }
    return 0.01; // Fallback
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
    
    // Apply caps from config
    const { maxScore, softCap } = LOYALTY_CONFIG.trust;
    if (newScore > softCap) newScore = softCap;
    if (newScore > maxScore) newScore = maxScore;

    // Generic Level Progression Logic
    let newLevel = profile.level || 1;
    for (const levelRule of LOYALTY_CONFIG.levels) {
      if (newPoints >= levelRule.minPoints) {
        newLevel = levelRule.level;
      }
    }

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
