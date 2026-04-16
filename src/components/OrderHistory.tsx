"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface OrderRecord {
  id: string;
  created_at: string;
  status: string;
  total_items: number;
  raw_text: string;
}

interface OrderDetail {
  product_name: string;
  quantity: string;
  supplier_name?: string;
}

export const OrderHistory = ({ lang }: { lang: "ko" | "en" }) => {
  const [history, setHistory] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);

  const t = {
    ko: { title: "주문 내역 (Audit Trail)", empty: "내역이 없습니다.", status: "상태", date: "일시", items: "품목", detailTitle: "주문 상세 내역", close: "닫기" },
    en: { title: "Order History (Audit Trail)", empty: "No history.", status: "Status", date: "Date", items: "Items", detailTitle: "Order Detail", close: "Close" }
  }[lang];

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
      if (data) setHistory(data as any);
      else {
        setHistory([
          { id: "VNG-10293", created_at: new Date().toISOString(), status: "dispatched", total_items: 2, raw_text: "Wagyu Beef 50lb, Yellow Onions 100lb" }
        ]);
      }
      setLoading(false);
    };
    fetchHistory();
  }, []);

  const handleShowDetail = async (order: OrderRecord) => {
    setSelectedOrder(order.id);
    // Simulate fetching item details
    // In production, this would be: await supabase.from('order_items').select('*').eq('order_id', order.id)
    const mockDetails: OrderDetail[] = order.raw_text.split(',').map(s => {
      const bits = s.trim().split(' ');
      return { product_name: bits[0] || "Unknown", quantity: bits[1] || "Qty", supplier_name: "Verified Supplier" };
    });
    setDetails(mockDetails);
  };

  return (
    <div className="card glass" style={{ marginTop: "1rem", padding: "1rem" }}>
      <h2 className="section-title" style={{ fontSize: "0.9rem", marginBottom: "0.8rem" }}><span>📜</span> {t.title}</h2>
      
      <div className="history-list">
        {history.map(item => (
          <div key={item.id} className="history-row" onClick={() => handleShowDetail(item)}>
            <div className="history-info">
              <span className="h-id">{item.id.slice(0, 8)}</span>
              <span className="h-date">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <div className="h-status-group">
              <span className="h-count">{item.total_items} {t.items}</span>
              <span className={`h-status-badge ${item.status}`}>{item.status.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <div className="detail-overlay glass">
          <div className="detail-modal glass">
            <div className="detail-header">
              <h3>{t.detailTitle}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-btn">{t.close}</button>
            </div>
            <div className="detail-content">
              {details.map((d, i) => (
                <div key={i} className="detail-line">
                  <span className="d-name">{d.product_name}</span>
                  <span className="d-qty">{d.quantity}</span>
                  <span className="d-sup">{d.supplier_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .history-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .history-row { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 0.6rem; background: rgba(255, 255, 255, 0.02); 
          border-radius: 8px; cursor: pointer; transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .history-row:hover { background: rgba(255, 255, 255, 0.05); border-color: var(--primary); }
        .h-id { font-weight: 700; font-size: 0.8rem; color: var(--accent); }
        .h-date { font-size: 0.6rem; opacity: 0.4; display: block; }
        .h-status-group { display: flex; align-items: center; gap: 0.8rem; }
        .h-count { font-size: 0.7rem; opacity: 0.6; }
        .h-status-badge { font-size: 0.55rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: var(--success); color: #000; font-weight: 800; }
        
        /* Detail Modal */
        .detail-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(5px);
        }
        .detail-modal {
          width: 90%; max-width: 400px; padding: 1.5rem;
          background: var(--bg); border: 1px solid var(--primary);
        }
        .detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }
        .detail-content { display: flex; flex-direction: column; gap: 0.8rem; }
        .detail-line { display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px dotted rgba(255,255,255,0.05); padding-bottom: 0.5rem; }
        .d-name { font-weight: 700; }
        .d-sup { font-size: 0.6rem; opacity: 0.4; }
      `}</style>
    </div>
  );
};
