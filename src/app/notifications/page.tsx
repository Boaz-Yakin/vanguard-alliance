"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { NotificationService, Notification } from "@/services/notificationService";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lang, setLang] = useState<"ko" | "en">("ko");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      
      try {
        const data = await NotificationService.getNotifications(user.id);
        setNotifications(data || []);
      } catch (err) {
        console.error("Error loading notifications:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await NotificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const t = {
    ko: {
      title: "알림 센터",
      back: "← 돌아가기",
      markAll: "모두 읽음 처리",
      empty: "새로운 알림이 없습니다.",
      order: "주문 알림",
      deal: "빅딜 소식",
    },
    en: {
      title: "Notifications",
      back: "← Back",
      markAll: "Mark all as read",
      empty: "No new notifications.",
      order: "Order Update",
      deal: "Deal News",
    }
  }[lang];

  return (
    <div className="container" style={{ minHeight: "100vh", background: "var(--surface-bg)" }}>
      {/* Header */}
      <div style={{ 
        padding: "1.5rem", background: "var(--surface-pure)", 
        borderBottom: "1px solid var(--outline-variant)",
        display: "flex", alignItems: "center", gap: "1rem"
      }}>
        <button onClick={() => router.back()} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>
          {t.back}
        </button>
        <h1 className="headline-md" style={{ margin: 0 }}>{t.title}</h1>
      </div>

      <div style={{ padding: "1rem 1.5rem" }}>
        {notifications.length > 0 && !loading && (
          <div style={{ textAlign: "right", marginBottom: "1rem" }}>
            <button onClick={handleMarkAllAsRead} style={{ 
              background: "transparent", border: "none", color: "var(--brand-primary)", 
              fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", textDecoration: "underline"
            }}>
              {t.markAll}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", color: "var(--brand-on-surface-variant)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔔</div>
            <p>{t.empty}</p>
            <button onClick={() => router.push("/")} className="btn-primary mt-4">구매하러 가기</button>
          </div>
        ) : (
          <div className="flex-col gap-4">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => {
                  NotificationService.markAsRead(n.id);
                  if (n.link) router.push(n.link);
                }}
                style={{ 
                  background: n.is_read ? "var(--surface-pure)" : "var(--surface-low)",
                  padding: "1.25rem", borderRadius: "var(--radius-lg)",
                  boxShadow: n.is_read ? "none" : "0 4px 12px rgba(0,0,0,0.05)",
                  borderLeft: n.is_read ? "1px solid var(--outline-variant)" : "4px solid var(--brand-primary)",
                  cursor: "pointer",
                  transition: "transform 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span className="label-md" style={{ color: n.type === 'order_status' ? "var(--brand-secondary)" : "var(--brand-primary)" }}>
                    {n.type === 'order_status' ? t.order : t.deal}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#999" }}>
                    {new Date(n.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className="title-md" style={{ fontWeight: 800, marginBottom: "0.25rem" }}>{n.title}</h3>
                <p className="body-md" style={{ color: "var(--brand-on-surface-variant)", lineHeight: 1.5 }}>{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
