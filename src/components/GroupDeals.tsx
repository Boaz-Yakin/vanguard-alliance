"use client";

import { useEffect, useState, useMemo } from "react";
import { GroupBuyingService, AllianceDeal } from "@/services/groupBuyingService";

interface GroupDealsProps {
  lang: "ko" | "en";
  onJoin: (dealId: string, itemName: string, quantity: string) => void;
  parsedItems?: { name: string, quantity: string }[];
  trustScore?: number;
}

export const GroupDeals = ({ lang, onJoin, parsedItems = [], trustScore = 0 }: GroupDealsProps) => {
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

  useEffect(() => {
    const fetchDeals = async () => {
      const data = await GroupBuyingService.getActiveDeals(trustScore);
      setDeals(data);
      setLoading(false);
    };
    fetchDeals();

    // Simulation: Global Volume Activity every 15s
    const interval = setInterval(() => {
      setDeals(prev => prev.map(deal => ({
        ...deal,
        currentVolume: Math.min(deal.targetVolume, deal.currentVolume + (Math.random() > 0.8 ? Math.floor(Math.random() * 8) : 0))
      })));
    }, 15000);

    return () => clearInterval(interval);
  }, [trustScore]);

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
    <div className="card glass deals-card" style={{ padding: "0.8rem", border: "1px solid var(--surface-border)" }}>
      <div className="section-header" style={{ marginBottom: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="section-title" style={{ color: "var(--accent)", fontSize: "0.9rem", margin: 0 }}>
          <span>🛰️</span> {t.title}
        </h2>
        <p style={{ fontSize: "0.65rem", opacity: 0.4 }}>{t.subtitle}</p>
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
            <div key={deal.id} className="deal-item glass" style={{ padding: "0.8rem" }}>
              <div className="deal-info" style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                    <span className="deal-name" style={{ fontSize: "0.85rem" }}>{deal.itemName}</span>
                    {deal.is_private && <span className="private-badge">{t.private}</span>}
                  </div>
                  <span style={{ fontSize: "0.55rem", opacity: 0.4 }}>{deal.supplierName}</span>
                </div>
                <div className="deal-badges">
                  <span className="deal-discount" style={{ fontSize: "0.6rem" }}>{(currentRate * 100).toFixed(0)}% OFF</span>
                </div>
              </div>
              
              <div className="progress-container" style={{ gap: "0.3rem" }}>
                <div className="progress-bar" style={{ height: "6px" }}>
                  <div className="progress-fill" style={{ width: `${baseProgress}%` }}></div>
                  {myProgress > 0 && <div className="my-progress-fill" style={{ left: `${baseProgress}%`, width: `${myProgress}%` }}></div>}
                </div>
                <div className="progress-stats" style={{ fontSize: "0.6rem" }}>
                  <span>{totalVol.toLocaleString()}/{deal.targetVolume.toLocaleString()} lb</span>
                  <span style={{ color: myVol > 0 ? "var(--success)" : "inherit" }}>
                    {((totalVol / deal.targetVolume) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="deal-footer" style={{ marginTop: "0.5rem", paddingTop: "0.5rem", height: "auto" }}>
                <div className="deal-timer" style={{ fontSize: "0.6rem" }}>
                  <span className="timer-value">{deal.expiresIn}</span>
                </div>
                <button 
                  className="text-btn join-btn"
                  onClick={() => handleJoin(deal.id)}
                  disabled={totalVol >= deal.targetVolume}
                  style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem !important" }}
                >
                  {t.join}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .deals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .deals-grid { grid-template-columns: 1fr; } }

        .deal-item {
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .deal-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
        .deal-discount { background: var(--success); color: #000; font-weight: 800; font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 4px; transition: all 0.5s; }
        .next-tier-badge { font-size: 0.55rem; opacity: 0.6; color: var(--accent); font-weight: 600; }

        .progress-container { display: flex; flex-direction: column; gap: 0.4rem; position: relative; }
        .progress-bar { height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden; position: relative; }
        
        .progress-fill {
          height: 100%;
          background: rgba(255, 255, 255, 0.2);
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          position: absolute;
          left: 0;
          z-index: 1;
        }

        .my-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
          box-shadow: 0 0 15px var(--primary-glow);
          position: absolute;
          z-index: 2;
          transition: all 0.5s ease-out;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }

        .tier-marker { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(255, 255, 255, 0.2); z-index: 3; }
        .progress-stats { display: flex; justify-content: space-between; font-size: 0.7rem; opacity: 0.5; }
        .deal-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid rgba(255, 255, 255, 0.05); }
        .deal-timer { font-size: 0.7rem; }
        .timer-label { opacity: 0.5; margin-right: 0.3rem; }
        .timer-value { font-family: var(--font-mono); color: var(--accent); }
        .join-btn { padding: 0.4rem 0.8rem !important; font-weight: 700; }

        .private-badge {
          font-size: 0.5rem;
          background: linear-gradient(135deg, #ffd700 0%, #b8860b 100%);
          color: #000;
          font-weight: 800;
          padding: 0.1rem 0.3rem;
          border-radius: 4px;
          letter-spacing: 0.5px;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
