/**
 * Generic Loyalty Configuration
 * This can be moved to a database table later for real-time adjustments.
 */
export const LOYALTY_CONFIG = {
  points: {
    baseRate: 1.0,
    thresholds: [
      { minAmount: 500, multiplier: 1.2 },
      { minAmount: 2000, multiplier: 1.5 },
    ],
  },
  trust: {
    maxScore: 10.0,
    softCap: 9.9, // Requires manual KYC to exceed
    boosts: [
      { maxAmount: 50, boost: 0.01 },
      { maxAmount: 200, boost: 0.05 },
      { maxAmount: 1000, boost: 0.15 },
      { defaultBoost: 0.3 },
    ],
  },
  levels: [
    { minPoints: 0, name: "Member", level: 1 },
    { minPoints: 500, name: "Bronze", level: 2 },
    { minPoints: 2500, name: "Silver", level: 3 },
    { minPoints: 10000, name: "Gold", level: 4 },
    { minPoints: 50000, name: "Vanguard Elite", level: 5 },
  ],
};

export type LoyaltyConfig = typeof LOYALTY_CONFIG;
