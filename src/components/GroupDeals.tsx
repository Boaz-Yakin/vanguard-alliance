"use client";

import { useEffect, useState, useMemo } from "react";
import { GroupBuyingService, AllianceDeal } from "@/services/groupBuyingService";

interface GroupDealsProps {
  lang: "ko" | "en";
  onJoin: (dealId: string, itemName: string, quantity: string) => void;
  parsedItems?: { name: string, quantity: string }[];
  trustScore?: number;
  refreshKey?: number;
}

export const GroupDeals = ({ lang, onJoin, parsedItems = [], trustScore = 0, refreshKey = 0 }: GroupDealsProps) => {
  const [deals, setDeals] = useState<AllianceDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    ko: {
      title: "동맹 공동 구매 (Alliance Synergy)",
      subtitle: "수량이 모일수록 할인율이 단계별로 상승합니다.",
      join: "참여하기",
      target: "현 수량",
      currentDiscount: "현재 할인",
      nextTier: "다음 단계",
      expires: "남은 시간",
      private: "엘리트 전용",
    },
    en: {
      title: "Alliance Synergy Deals",
      subtitle: "Discounts unlock in stages as volume grows.",
      join: "Join Deal",
      target: "Current",
      currentDiscount: "Current",
      nextTier: "Next Tier",
      expires: "Expires",
      private: "ELITE ONLY",
    }
  }[lang];

  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const fetchDeals = async () => {
      const data = await GroupBuyingService.getActiveDeals(trustScore);
      setDeals(data);
      setLoading(false);
    };
    fetchDeals();

    const volumeInterval = setInterval(() => {
      setDeals(prev => prev.map(deal => ({
        ...deal,
        currentVolume: Math.min(deal.targetVolume, deal.currentVolume + (Math.random() > 0.8 ? Math.floor(Math.random() * 8) : 0))
      })));
    }, 15000);

    const timerInterval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(volumeInterval);
      clearInterval(timerInterval);
    };
  }, [trustScore, refreshKey]);

  const calculateTimeLeft = (expiryDate: string) => {
    const diff = new Date(expiryDate).getTime() - now.getTime();
    if (diff <= 0) return "EXPIRED";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  /**
   * Calculate User's current contribution from textarea
   */
  const myContributions = useMemo(() => {
    const counts: Record<string, number> = {};
    parsedItems.forEach(item => {
      const match = deals.find(d => item.name.toLowerCase().includes(d.itemName.toLowerCase().split(' ')[0]));
      if (match) {
        const qty = parseFloat(item.quantity) || 0;
        counts[match.id] = (counts[match.id] || 0) + qty;
      }
    });
    return counts;
  }, [parsedItems, deals]);

  const handleJoin = (dealId: string) => {
    // Only used for the "Invite/Join" flow from the button
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      const addedVolume = deal.itemName.toLowerCase().includes("beef") ? 50 : 100;
      onJoin(deal.id, deal.itemName, `${addedVolume}lb`);
    }
  };

  return (
    <div className="card deals-card" style={{ padding: "0.8rem", border: "1px solid var(--outline-variant)", borderRadius: "var(--radius-xl)", background: "transparent" }}>
      <div className="section-header" style={{ marginBottom: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="section-title" style={{ color: "var(--primary)", fontSize: "1rem", margin: 0, fontWeight: 800 }}>
          <span>🛰️</span> {t.title}
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>{t.subtitle}</p>
      </div>

      <div className="deals-grid">
        {deals.map(deal => {
          const myVol = myContributions[deal.id] || 0;
          const totalVol = Math.min(deal.targetVolume, deal.currentVolume + myVol);
          const baseProgress = (deal.currentVolume / deal.targetVolume) * 100;
          const myProgress = (myVol / deal.targetVolume) * 100;
          
          const currentRate = GroupBuyingService.getCurrentDiscountRate({ ...deal, currentVolume: totalVol });
          const nextTier = deal.tiers.find(t => t.threshold > (totalVol / deal.targetVolume));

          return (
            <div key={deal.id} className="deal-item" style={{ padding: "0", background: "var(--surface-container-lowest)", borderRadius: "12px", boxShadow: "var(--ambient-shadow)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Product Image Section */}
              <div 
                className="deal-image-container" 
                style={{ 
                  width: "100%", 
                  height: "160px", 
                  backgroundSize: "contain", 
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center", 
                  backgroundColor: "#ffffff",
                  backgroundImage: `url(${deal.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400&h=300'})`,
                  position: "relative"
                }}
              >
                <div className="deal-badges" style={{ position: "absolute", top: "12px", right: "12px", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                  <div className="badge-discount" style={{ 
                    background: "var(--brand-primary)", 
                    color: "var(--brand-on-primary)", 
                    padding: "6px 14px", 
                    borderRadius: "100px", 
                    fontWeight: "900", 
                    fontSize: "0.9rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    border: "2px solid rgba(255,255,255,0.2)"
                  }}>
                    {(currentRate * 100).toFixed(0)}% OFF
                  </div>
                </div>
              </div>

              <div style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="deal-info" style={{ marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span className="deal-name" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--on-surface)" }}>{deal.itemName}</span>
                      {deal.is_private && <span className="private-badge">{t.private}</span>}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>{deal.supplierName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="headline-md" style={{ fontWeight: 800 }}>${deal.pricePerUnit}</span>
                      <span className="label-md" style={{ marginLeft: "4px", color: "var(--on-surface-variant)" }}>/ {deal.unit || 'unit'}</span>
                    </div>
                  </div>
                </div>
              
              <div className="progress-container" style={{ gap: "0.3rem" }}>
                <div className="progress-bar" style={{ height: "16px", background: "#e0e0e0", borderRadius: "8px", position: "relative", marginTop: "20px", overflow: "visible", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
                  <div className="progress-fill" style={{ 
                    width: `${baseProgress}%`, 
                    background: baseProgress > 80 ? "linear-gradient(90deg, #007bff 0%, #ffc107 100%)" : "#007bff", 
                    height: "100%", position: "absolute", left: 0, zIndex: 1, borderRadius: "8px",
                    transition: "width 0.5s ease-out",
                    boxShadow: "0 0 10px rgba(0,123,255,0.3)"
                  }}></div>
                  {myProgress > 0 && <div className="my-progress-fill" style={{ left: `${baseProgress}%`, width: `${myProgress}%`, background: "#28a745", height: "100%", position: "absolute", zIndex: 1 }}></div>}
                  
                  {/* High-Contrast Tier Dividers (Separated Top/Bottom) */}
                  {deal.tiers.map((tier, idx) => {
                    const pos = tier.threshold * 100;
                    const isReached = (totalVol / deal.targetVolume) >= tier.threshold;
                    return (
                      <div key={idx} style={{ position: "absolute", left: `${pos}%`, top: 0, bottom: 0, width: "3px", background: isReached ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)", zIndex: 3, pointerEvents: "none" }}>
                        {/* Discount Label - MOVED TO TOP */}
                        <div style={{ 
                          position: "absolute", left: 0, top: "-18px", transform: "translateX(-50%)",
                          fontSize: "0.65rem", fontWeight: 900, color: isReached ? "var(--brand-primary)" : "var(--brand-on-surface-variant)",
                          whiteSpace: "nowrap"
                        }}>
                          {(tier.rate * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Volume Stats Summary - ALREADY BELOW */}
                <div className="progress-stats" style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                  <span style={{ fontWeight: 600 }}>{totalVol.toLocaleString()}/{deal.targetVolume.toLocaleString()} lb</span>
                  <span style={{ color: myVol > 0 ? "var(--primary)" : "inherit", fontWeight: 700 }}>
                    {((totalVol / deal.targetVolume) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="deal-footer" style={{ marginTop: "0.5rem", paddingTop: "1rem", borderTop: "1px solid var(--outline-variant)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="deal-timer" style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", fontWeight: 600 }}>
                  <span className="timer-value">{calculateTimeLeft(deal.expiresAt)}</span>
                </div>
                <button 
                  className="btn-primary join-btn"
                  onClick={() => handleJoin(deal.id)}
                  disabled={totalVol >= deal.targetVolume}
                  style={{ fontSize: "0.85rem", padding: "0.4rem 1rem" }}
                >
                  {t.join}
                </button>
              </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .deals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .deals-grid { grid-template-columns: 1fr; } }
        .deal-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
        
        button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: var(--surface-variant);
          color: var(--on-surface-variant);
        }

        .private-badge {
          font-size: 0.55rem;
          background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
          color: #000;
          font-weight: 800;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          letter-spacing: 0.5px;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
