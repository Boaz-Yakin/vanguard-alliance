"use client";

import { useState, useMemo, useEffect } from "react";
import { OrderService } from "@/services/orderService";
import { parseOrderText } from "@/lib/parser";
import { OrderHistory } from "@/components/OrderHistory";
import { GroupDeals } from "@/components/GroupDeals";
import { GroupBuyingService } from "@/services/groupBuyingService";

interface OrderItem {
  id: string;
  name: string;
  quantity: string;
  supplier_name?: string;
}

interface DispatchStep {
  supplierName: string;
  status: "idle" | "connecting" | "encrypting" | "sent" | "failed";
  pdfBlob?: Blob;
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Phase 5.0: Multi-location State
  const [branches] = useState([
    { id: "b1", name: "Vanguard Downtown", location: "New York" },
    { id: "b2", name: "Vanguard Uptown", location: "Boston" },
    { id: "b3", name: "Elite Warehouse", location: "Global" }
  ]);
  const [activeBranch, setActiveBranch] = useState(branches[0]);
  
  const [userStats, setUserStats] = useState({ points: 1250, trust: 5.00 });
  const [routedItems, setRoutedItems] = useState<OrderItem[]>([]);
  const [dispatchSteps, setDispatchSteps] = useState<DispatchStep[]>([]);
  const [potentialSavings, setPotentialSavings] = useState(0);
  const [allDeals, setAllDeals] = useState<any[]>([]);

  // Parser
  const parsedItems = useMemo(() => parseOrderText(inputText), [inputText]);

  // Update routing & savings preview & deals data
  useEffect(() => {
    const syncData = async () => {
      // Fetch deals for the current trust level
      const deals = await GroupBuyingService.getActiveDeals(userStats.trust);
      setAllDeals(deals);

      if (parsedItems.length > 0) {
        const routed = await OrderService.previewRouting(parsedItems as any);
        setRoutedItems(routed as any);
        const savings = await GroupBuyingService.calculatePotentialSavings(parsedItems as any, userStats.trust);
        setPotentialSavings(savings);
      } else {
        setRoutedItems([]);
        setPotentialSavings(0);
      }
    };
    
    const timer = setTimeout(syncData, 500);
    return () => clearTimeout(timer);
  }, [parsedItems, userStats.trust]);

  const t = {
    ko: {
      title: "VANGUARD PROTOTYPE",
      subtitle: "Vanguard Alliance 주문 시스템 v1.0",
      statsPoints: "내 포인트",
      statsTrust: "신뢰도",
      inputTitle: "스마트 주문 입력",
      inputPlaceholder: "주문 내용을 입력하세요 (예: Beef 50lb, Onions 100lb)",
      button: "공급업체로 주문 전송 🚀",
      buttonLoading: "연합 통신망 가동 중...",
      previewTitle: "주문 분석 및 라우팅 (Vanguard Engine)",
      routingLabel: "공급처",
      success: "✅ 모든 주문서가 성공적으로 전송되었습니다!",
      dispatchTitle: "발송 상태 (Fulfillment Hub)",
      viewPdf: "PDF 보기",
      savingsLabel: "총 절감 예상액",
      currency: "$",
      connecting: "🛰️ 연결 중...",
      encrypting: "📑 암호화...",
      sent: "✅ 전송됨",
      footer: "© 2026 VANGUARD ALLIANCE - Intelligence Service Launch Edition",
    },
    en: {
      title: "VANGUARD PROTOTYPE",
      subtitle: "Vanguard Alliance Order System v1.0",
      statsPoints: "My Points",
      statsTrust: "Trust Score",
      inputTitle: "Smart Order Input",
      inputPlaceholder: "Enter order details (e.g., Beef 50lb, Onions 100lb)",
      button: "Dispatch Order to Supplier 🚀",
      buttonLoading: "Syncing Alliance Network...",
      previewTitle: "Order Analysis & Routing (Vanguard Engine)",
      routingLabel: "Supplier",
      success: "✅ All orders dispatched successfully!",
      dispatchTitle: "Fulfillment Hub",
      viewPdf: "View PDF",
      savingsLabel: "Potential Savings",
      currency: "$",
      connecting: "🛰️ Connecting...",
      encrypting: "📑 Encrypting...",
      sent: "✅ SENT",
      footer: "© 2026 VANGUARD ALLIANCE - Intelligence Service Launch Edition",
    }
  }[lang];

  const synergyHint = useMemo(() => {
    if (routedItems.length === 0 || allDeals.length === 0) return null;
    const hints: string[] = [];
    
    routedItems.forEach(item => {
      const deal = allDeals.find(d => d.itemName.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]));
      if (deal) {
        const myQty = parseFloat(item.quantity) || 0;
        const totalWithMe = deal.currentVolume + myQty;
        const currentProgress = totalWithMe / deal.targetVolume;
        
        const nextTier = deal.tiers.find((t: any) => t.threshold > currentProgress);
        if (nextTier) {
          const neededForNext = (nextTier.threshold * deal.targetVolume) - totalWithMe;
          if (neededForNext > 0 && neededForNext <= (deal.targetVolume * 0.15)) {
            hints.push(`${item.name}: ${neededForNext.toFixed(1)}lb만 더 추가하면 ${(nextTier.rate * 100).toFixed(0)}% 할인 구간에 진입합니다!`);
          }
        }
      }
    });
    return hints;
  }, [routedItems, allDeals]);

  const handleDispatch = async () => {
    if (routedItems.length === 0) return;
    setIsLoading(true);
    
    // Initialize steps
    const suppliers = Array.from(new Set(routedItems.map(i => i.supplier_name)));
    const initialSteps: DispatchStep[] = suppliers.map(s => ({ supplierName: s || "Unknown", status: "idle" }));
    setDispatchSteps(initialSteps);

    // Run Cinematic Sequence
    for (let i = 0; i < initialSteps.length; i++) {
      const supplier = initialSteps[i].supplierName;
      
      // 1. Connecting
      updateStep(supplier, "connecting");
      await new Promise(r => setTimeout(r, 600));
      
      // 2. Encrypting
      updateStep(supplier, "encrypting");
      await new Promise(r => setTimeout(r, 800));
      
      // 3. Sent (Fetch the real result)
      const supplierItems = routedItems.filter(item => item.supplier_name === supplier);
      const { dispatchResults } = await OrderService.saveOrder(null, inputText, supplierItems as any);
      
      updateStep(supplier, "sent", dispatchResults[0]?.pdfBlob);
      await new Promise(r => setTimeout(r, 300));
    }

    setIsLoading(false);
    setInputText("");
    setUserStats(prev => ({ ...prev, points: prev.points + 60, trust: Math.min(10, prev.trust + 0.05) }));
  };

  const updateStep = (supplier: string, status: DispatchStep["status"], pdfBlob?: Blob) => {
    setDispatchSteps(prev => prev.map(s => s.supplierName === supplier ? { ...s, status, pdfBlob } : s));
  };

  const handleViewPdf = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <main className="container">
      <div className="top-bar glass" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <select 
            className="branch-select"
            value={activeBranch.id}
            onChange={(e) => setActiveBranch(branches.find(b => b.id === e.target.value) || branches[0])}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="analytics-btn" onClick={() => setShowAnalytics(true)}>📊 Insight</button>
        </div>

        <div className="stats-container" style={{ gap: "1.2rem" }}>
          <div className="stat">
            <span className="stat-label">{t.statsPoints}</span>
            <span className="stat-value">{userStats.points.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t.statsTrust}</span>
            <span className="stat-value">⭐ {userStats.trust.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="lang-switcher">
          <button className={`lang-btn ${lang === "ko" ? "active" : ""}`} onClick={() => setLang("ko")}>KO</button>
          <button className={`lang-btn ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>EN</button>
        </div>
      </div>

      <header className="header">
        <h1 className="title">{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </header>

      <GroupDeals 
        lang={lang} 
        onJoin={(item, qty) => setInputText(p => p ? `${p}, ${item} ${qty}` : `${item} ${qty}`)} 
        parsedItems={parsedItems as any} 
        trustScore={userStats.trust}
      />

      <div className="card glass foresight-card" style={{ borderLeft: "4px solid var(--accent)", padding: "0.8rem" }}>
        <h2 className="section-title" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          <span>🔮</span> {lang === "ko" ? "Vanguard AI 재고 예측" : "Vanguard AI Foresight"}
        </h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="prediction-item glass" style={{ flex: 1, padding: "0.5rem" }}>
            <div style={{ fontSize: "0.6rem", opacity: 0.5 }}>Predicted Stock Out: 3 days</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>Yellow Onions</div>
            <button className="text-btn" style={{ marginTop: "0.4rem", width: "100%", fontSize: "0.6rem" }} onClick={() => setInputText("Yellow Onions 50lb")}>+ Add 50lb to Synergy</button>
          </div>
          <div className="prediction-item glass" style={{ flex: 1, padding: "0.5rem" }}>
            <div style={{ fontSize: "0.6rem", opacity: 0.5 }}>Strategic Opportunity</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>Wagyu Beef</div>
            <button className="text-btn" style={{ marginTop: "0.4rem", width: "100%", fontSize: "0.6rem" }} onClick={() => setInputText("Wagyu Beef 20lb")}>+ Secure 12% Discount</button>
          </div>
        </div>
      </div>

      <div className="card glass" style={{ padding: "1rem" }}>
        <h2 className="section-title" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}><span>📝</span> {t.inputTitle}</h2>
        <textarea
          className="textarea"
          style={{ height: "80px", fontSize: "0.85rem", padding: "0.8rem" }}
          placeholder={t.inputPlaceholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        
        {synergyHint && synergyHint.length > 0 && (
          <div className="synergy-hint-box" style={{ marginBottom: "0.8rem" }}>
            {synergyHint.map((h, i) => (
              <div key={i} className="hint-line">⚡ {h}</div>
            ))}
          </div>
        )}
        
        {potentialSavings > 0 && (
          <div className="success-badge" style={{ marginTop: "0.5rem", padding: "0.3rem", fontSize: "0.75rem", background: "rgba(0, 255, 136, 0.1)", border: "1px solid rgba(0, 255, 136, 0.2)" }}>
            💰 {t.savingsLabel}: {t.currency}{potentialSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}

        <button 
          className="button"
          style={{ marginTop: "0.8rem", padding: "0.6rem" }}
          onClick={handleDispatch}
          disabled={routedItems.length === 0 || isLoading}
        >
          {isLoading ? t.buttonLoading : t.button}
        </button>
      </div>

      {dispatchSteps.length > 0 && (
        <div className="card glass info-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <h2 className="section-title" style={{ fontSize: "1rem" }}><span>📦</span> {t.dispatchTitle}</h2>
          <div className="dispatch-list">
            {dispatchSteps.map((step, i) => (
              <div key={i} className="dispatch-item">
                <span className="supplier-name">{step.supplierName}</span>
                <span className={`dispatch-status-text ${step.status}`}>
                  {step.status === "connecting" && t.connecting}
                  {step.status === "encrypting" && t.encrypting}
                  {step.status === "sent" && t.sent}
                </span>
                {step.pdfBlob && <button className="text-btn" onClick={() => handleViewPdf(step.pdfBlob!)}>{t.viewPdf}</button>}
              </div>
            ))}
          </div>
          {dispatchSteps.every(s => s.status === "sent") && <div className="success-badge" style={{ marginTop: "1rem" }}>{t.success}</div>}
        </div>
      )}

      {routedItems.length > 0 && !isLoading && dispatchSteps.every(s => s.status !== "sent") && (
        <div className="card glass">
          <h2 className="section-title"><span>🔍</span> {t.previewTitle}</h2>
          <div className="preview-list">
            {routedItems.map((item) => (
              <div key={item.id} className="preview-item">
                <div className="item-main">
                  <span className="item-name">{item.name}</span>
                  <span className="item-qty">{item.quantity}</span>
                </div>
                <div className="item-routing">
                  <span className="routing-label">{t.routingLabel}:</span>
                  <span className="supplier-name">{item.supplier_name || "..."}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <OrderHistory lang={lang} />

      {showAnalytics && (
        <div className="detail-overlay glass" style={{ zIndex: 2000 }}>
          <div className="detail-modal glass" style={{ maxWidth: "500px", border: "1px solid #ffd700", animation: "slideUp 0.3s ease-out" }}>
            <div className="detail-header" style={{ borderBottom: "1px solid #ffd70033" }}>
              <h3 style={{ color: "#ffd700" }}>🏆 {lang === "ko" ? "시너지 수익 보고서" : "Synergy Profit Report"}</h3>
              <button onClick={() => setShowAnalytics(false)} className="text-btn">{lang === "ko" ? "닫기" : "Close"}</button>
            </div>
            <div className="analytics-body" style={{ padding: "1rem 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="stat-box glass" style={{ padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.6rem", opacity: 0.5 }}>TOTAL SAVINGS</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--success)" }}>$4,285.50</div>
                </div>
                <div className="stat-box glass" style={{ padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.6rem", opacity: 0.5 }}>SYNERGY BOOST</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--accent)" }}>+22.4%</div>
                </div>
              </div>
              <div className="branch-savings">
                <h4 style={{ fontSize: "0.8rem", marginBottom: "0.5rem", opacity: 0.6 }}>Savings by Branch</h4>
                {branches.map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.85rem" }}>
                    <span style={{ opacity: 0.8 }}>{b.name}</span>
                    <span style={{ fontWeight: 700 }}>${(Math.random() * 2000 + 500).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <p style={{ fontSize: "0.6rem", opacity: 0.4, textAlign: "center", marginTop: "1rem" }}>
              Vanguard Intelligence Service: Optimized for Enterprise Scale.
            </p>
          </div>
        </div>
      )}

      <footer style={{ textAlign: "center", marginTop: "3rem", opacity: 0.5, fontSize: "0.8rem" }}>{t.footer}</footer>

      <style jsx>{`
        .dispatch-status-text { font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px; }
        .dispatch-status-text.connecting { color: var(--accent); animation: blink 1s infinite; }
        .dispatch-status-text.encrypting { color: var(--primary); }
        .dispatch-status-text.sent { color: var(--success); }
        
        @keyframes blink { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>
    </main>
  );
}
