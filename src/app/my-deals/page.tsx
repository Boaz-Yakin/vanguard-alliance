"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealEntry[]>([]);

  const t = {
    ko: {
      title: "내 공동구매 내역",
      subtitle: "레스토랑 발주 장부",
      empty: "참여한 공동구매가 없습니다.",
      emptyHint: "메인 화면에서 딜에 참여해보세요!",
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
    },
    en: {
      title: "My Group Deals",
      subtitle: "Restaurant Order History",
      empty: "No active participations yet.",
      emptyHint: "Browse deals on the home screen!",
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
    }
  }[lang];

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser(user);

      // Fetch orders joined by this user, with deal info
      try {
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
          // Flatten orders → line-items for the ledger view
          const rows: DealEntry[] = [];
          data.forEach((order: any) => {
            (order.order_items || []).forEach((item: any) => {
              rows.push({
                id: order.id,
                item_name: item.product_name,
                item_name_en: item.product_name,
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

  const grandTotal = deals.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="container" style={{ paddingBottom: "100px" }}>
      {/* Top Nav */}
      <nav className="top-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a href="/" style={{ color: "var(--on-surface)", textDecoration: "none", fontWeight: 700 }}>←</a>
          <div>
            <h1 className="top-nav-title display-txt">{t.title}</h1>
            <p className="label-md" style={{ color: "var(--on-surface-variant)", margin: 0 }}>{t.subtitle}</p>
          </div>
        </div>
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
                ${grandTotal.toFixed(2)}
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
                    <span style={{
                      background: deal.status === "active" ? "var(--primary-container)" : "var(--surface-variant)",
                      color: deal.status === "active" ? "var(--on-primary-container)" : "var(--on-surface-variant)",
                      borderRadius: "100px", padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700,
                      whiteSpace: "nowrap", marginLeft: "8px"
                    }}>
                      {deal.status === "active" ? t.statActive : t.statClosed}
                    </span>
                  </div>

                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem", marginTop: "1rem",
                    paddingTop: "1rem", borderTop: "1px solid var(--outline-variant)"
                  }}>
                    <div>
                      <p className="label-sm" style={{ color: "var(--on-surface-variant)" }}>{t.colQty}</p>
                      <p className="body-md" style={{ fontWeight: 700 }}>{deal.qty} {deal.unit}</p>
                    </div>
                    <div>
                      <p className="label-sm" style={{ color: "var(--on-surface-variant)" }}>{t.colPrice}</p>
                      <p className="body-md" style={{ fontWeight: 700 }}>${deal.price_per_unit.toFixed(2)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="label-sm" style={{ color: "var(--on-surface-variant)" }}>{t.colTotal}</p>
                      <p className="body-md" style={{ fontWeight: 800, color: "var(--primary)" }}>${deal.total.toFixed(2)}</p>
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
          {lang === "ko" ? "내 내역" : "My Deals"}
        </a>
        <a href="/profile" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {lang === "ko" ? "프로필" : "Profile"}
        </a>
      </div>
    </div>
  );
}
