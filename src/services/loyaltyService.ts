import { supabase } from "@/lib/supabaseClient";

/**
 * Vanguard Special: Loyalty & Trust Score Engine
 */
export const LoyaltyService = {
  /**
   * Calculate points based on order complexity or volume
   * Prototype: 100 points per unique item category
   */
  calculatePoints(itemCount: number): number {
    const basePoints = 50;
    const itemBonus = itemCount * 10;
    return basePoints + itemBonus;
  },

  /**
   * Reward user with points and update trust score
   */
  async grantOrderReward(userId: string): Promise<void> {
    const pointsToAdd = this.calculatePoints(5); // Mock item count logic

    // Update profile (Atomic increment if possible, or fetch-then-update)
    const { data: profile } = await supabase
      .from("profiles")
      .select("points, trust_score")
      .eq("id", userId)
      .single();

    if (profile) {
      const newPoints = (profile.points || 0) + pointsToAdd;
      const newTrust = Math.min(10.0, (profile.trust_score || 0) + 0.05);

      await supabase
        .from("profiles")
        .update({ 
          points: newPoints, 
          trust_score: newTrust 
        })
        .eq("id", userId);
    }
  }
};
