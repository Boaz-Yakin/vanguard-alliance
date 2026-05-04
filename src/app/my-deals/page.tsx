"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DealService } from "@/services/dealService";
import { generateAmazonInvoice } from "@/lib/invoiceGenerator";

type DealEntry = {
  id: string;
  item_name: string;
  item_name_en: string;
  unit: string;
  price_per_unit: number;
  qty: number;
  total: number;
  status: string;
  joined_at: string;
};

export default function MyDealsPage() {
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealEntry[]>([]);

  const t = {
    ko: {
      title: "주문내역",
      subtitle: "레스토랑 발주 장부",
      empty: "참여한 빅딜이 없습니다.",
      emptyHint: "메인 화면에서 빅딜에 참여해보세요!",
      goHome: "딜 둘러보기 →",
      totalLabel: "총 발주 합계",
      colItem: "상품명",
      colQty: "수량",
      colPrice: "단가",
      colTotal: "합계",
      colStatus: "상태",
      colDate: "참여일",
      statActive: "진행중",
      statClosed: "마감",
      back: "뒤로",
    },
    en: {
      title: "My Big Deals",
      subtitle: "Restaurant Order History",
      empty: "No big deals yet.",
      emptyHint: "Browse big deals on the home screen!",
      goHome: "Browse Deals →",
      totalLabel: "Total Committed",
      colItem: "Product",
      colQty: "Qty",
      colPrice: "Unit Price",
      colTotal: "Total",
      colStatus: "Status",
      colDate: "Joined",
      statActive: "Active",
      statClosed: "Closed",
      back: "Back",
    }
  }[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem("vanguard-lang") as "ko" | "en";
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser(user);

      // Fetch user profile for invoice address
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      // Fetch orders joined by this user
      try {
        // 1. Get all deals first for English lookup
        const { data: allDeals } = await supabase.from("deals").select("item_name, item_name_en");
        const dealMap = new Map();
        allDeals?.forEach((d: any) => dealMap.set(d.item_name, d.item_name_en));

        // 2. Fetch orders without broken join
        const { data, error } = await supabase
          .from("orders")
          .select(`
            id,
            created_at,
            total_amount,
            status,
            order_items (
              quantity,
              price,
              product_name
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          const rows: DealEntry[] = [];
          data.forEach((order: any) => {
            (order.order_items || []).forEach((item: any) => {
              // Smart lookup for English title
              const enTitle = dealMap.get(item.product_name) || item.product_name;
              rows.push({
                id: order.id,
                item_name: item.product_name,
                item_name_en: enTitle,
                unit: "unit",
                price_per_unit: Number(item.price),
                qty: Number(item.quantity),
                total: Number(item.price) * Number(item.quantity),
                status: order.status,
                joined_at: order.created_at,
              });
            });
          });
          setDeals(rows);
        }
      } catch (e) {
        console.warn("VANGUARD: Could not fetch deal history.", e);
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    const confirmMsg = lang === "ko" 
      ? "정말 주문을 취소하시겠습니까?\n공동구매 달성 수량에서 제외됩니다." 
      : "Are you sure you want to cancel this order?\nIt will be removed from the deal total.";
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await DealService.cancelOrder(orderId);
      if (res.success) {
        alert(lang === "ko" ? "주문이 취소되었습니다." : "Order cancelled successfully.");
        window.location.reload(); // Refresh to show updated volume
      } else {
        alert(lang === "ko" ? "취소 실패: " + res.error : "Cancel failed: " + res.error);
      }
    } catch (e) {
      console.error("VANGUARD: Cancel error", e);
    }
  };

  const handleDownloadInvoice = async (deal: DealEntry) => {
    console.log("[MyDeals] Starting invoice download & archive for:", deal.id);
    try {
      await generateAmazonInvoice({
        orderId: deal.id,
        userId: user.id,
        date: new Date(deal.joined_at).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
        restaurantName: profile?.restaurant_name || user.email || "Valued Member",
        restaurantAddress: profile?.restaurant_address || "Registered Business Address",
        restaurantPhone: profile?.phone_number || "N/A",
        taxId: profile?.tax_id,
        items: [{
          name: deal.item_name_en || deal.item_name,
          qty: deal.qty,
          price: deal.price_per_unit,
          total: deal.total
        }],
        grandTotal: deal.total
      }, true); // Set download=true
      console.log("[MyDeals] Invoice generation and cloud archive call finished.");
    } catch (err) {
      console.error("[MyDeals] Error during invoice generation:", err);
    }
  };

  const grandTotal = deals.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="container" style={{ paddingBottom: "100px" }}>
      {/* Top Nav */}
      <nav className="top-nav" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
        <div style={{ justifySelf: "start" }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--on-surface)", textDecoration: "none", fontWeight: 700 }}>
            ← <span style={{ fontSize: "0.9rem" }}>{t.back}</span>
          </a>
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 className="top-nav-title display-txt">{t.title}</h1>
          <p className="label-md" style={{ color: "var(--on-surface-variant)", margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ justifySelf: "end" }}>
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            style={{
              background: "var(--surface-variant)", border: "1px solid var(--outline-variant)",
              borderRadius: "var(--radius-md)", padding: "4px 10px",
              cursor: "pointer", fontWeight: "700", fontSize: "0.8rem",
              color: "var(--on-surface-variant)"
            }}
          >
            {lang === "ko" ? "EN" : "KR"}
          </button>
        </div>
      </nav>

      <div style={{ padding: "0 1.5rem" }}>
        {loading ? (
          <p style={{ textAlign: "center", padding: "4rem", color: "var(--on-surface-variant)" }}>
            Loading...
          </p>
        ) : deals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
            <p className="headline-md" style={{ color: "var(--on-surface)" }}>{t.empty}</p>
            <p className="body-md mt-2" style={{ color: "var(--on-surface-variant)" }}>{t.emptyHint}</p>
            <a href="/" className="btn-primary" style={{ display: "inline-block", marginTop: "1.5rem", textDecoration: "none", padding: "12px 24px" }}>
              {t.goHome}
            </a>
          </div>
        ) : (
          <>
            {/* Grand Total Banner */}
            <div className="section" style={{
              background: "var(--primary)", color: "var(--on-primary)",
              padding: "1.5rem", borderRadius: "1rem", marginBottom: "1.5rem",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <span className="title-md" style={{ opacity: 0.85 }}>{t.totalLabel}</span>
              <span className="headline-md" style={{ fontWeight: 800 }}>
                ${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
            </div>

            {/* Deal Rows */}
            <div className="flex-col gap-4">
              {deals.map((deal, idx) => (
                <div key={`${deal.id}-${idx}`} className="section" style={{
                  background: "var(--surface-container-lowest)",
                  padding: "1.25rem", borderRadius: "1rem",
                  boxShadow: "var(--ambient-shadow)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h3 className="body-lg" style={{ fontWeight: 700, color: "var(--on-surface)" }}>
                        {lang === "ko" ? deal.item_name : deal.item_name_en}
                      </h3>
                      <p className="label-md mt-1" style={{ color: "var(--on-surface-variant)" }}>
                        {new Date(deal.joined_at).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US")}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span style={{
                        background: "var(--surface-variant)",
                        color: "var(--on-surface-variant)",
                        borderRadius: "100px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}>
                        {deal.status === "cancelled" 
                          ? (lang === "ko" ? "주문 취소됨" : "Cancelled")
                          : (deal.status === "dispatched" ? t.statClosed : t.statActive)}
                      </span>
                      {/* Cancellation logic maintained but deposit badge removed */}
                      <button 
                        onClick={() => handleDownloadInvoice(deal)}
                        className="btn-text"
                        style={{ 
                          fontSize: "0.7rem", padding: "4px 8px", color: "var(--brand-primary)",
                          textDecoration: "underline", fontWeight: 700
                        }}
                      >
                        {lang === "ko" ? "영수증 출력" : "Invoice PDF"}
                      </button>
                      
                      {/* Show cancel button if not already cancelled */}
                      {deal.status !== "cancelled" && (
                        <button 
                          onClick={() => handleCancelOrder(deal.id)}
                          style={{ 
                            fontSize: "0.7rem", padding: "4px 8px", 
                            color: "#ba1a1a", background: "none", border: "none",
                            textDecoration: "underline", fontWeight: 700, cursor: "pointer"
                          }}
                        >
                          {lang === "ko" ? "주문 취소" : "Cancel Order"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem", marginTop: "1rem",
                    paddingTop: "1rem", borderTop: "1px solid var(--outline-variant)"
                  }}>
                    <div>
                      <p className="label-sm" style={{ color: "var(--on-surface-variant)" }}>{t.colQty}</p>
                      <p className="body-md" style={{ fontWeight: 700 }}>{deal.qty.toLocaleString('en-US')} {deal.unit}</p>
                    </div>
                    <div>
                      <p className="label-sm" style={{ color: "var(--on-surface-variant)" }}>{t.colPrice}</p>
                      <p className="body-md" style={{ fontWeight: 700 }}>${deal.price_per_unit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="label-sm" style={{ color: "var(--on-surface-variant)" }}>{t.colTotal}</p>
                      <p className="body-md" style={{ fontWeight: 800, color: "var(--primary)" }}>${deal.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <a href="/" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          {lang === "ko" ? "홈" : "Home"}
        </a>
        <a href="/my-deals" className="nav-item active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          {lang === "ko" ? "주문내역" : "My Deals"}
        </a>
        <a href="/profile" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {lang === "ko" ? "프로필" : "Profile"}
        </a>
      </div>
    </div>
  );
}
