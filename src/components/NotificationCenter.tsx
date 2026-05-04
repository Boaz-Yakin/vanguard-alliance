"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationService, Notification } from "@/services/notificationService";

interface NotificationCenterProps {
  userId: string;
  lang: "ko" | "en";
}

export default function NotificationCenter({ userId, lang }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      try {
        const data = await NotificationService.getNotifications(userId);
        setNotifications(data || []);
      } catch (err) {
        console.warn("[NotificationCenter] Error loading notifications:", err);
        setNotifications([]);
      }
    };
    loadNotifications();

    const subscription = NotificationService.subscribe(userId, (payload) => {
      setNotifications(prev => [payload.new as Notification, ...prev]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    await NotificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const t = {
    ko: {
      title: "알림 센터",
      markAll: "모두 읽음",
      empty: "새로운 소식이 없습니다.",
      close: "닫기",
    },
    en: {
      title: "Notification Center",
      markAll: "Mark all as read",
      empty: "No new notifications.",
      close: "Close",
    }
  }[lang];

  return (
    <>
      {/* 1. The Bell Button */}
      <div className="notification-bell-container" style={{ position: "relative", zIndex: 100 }}>
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            background: "transparent", border: "none", cursor: "pointer", 
            color: "var(--on-surface)", display: "flex", alignItems: "center", 
            justifyContent: "center", width: "44px", height: "44px"
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && (
            <span style={{ 
              position: "absolute", top: "8px", right: "8px", width: "10px", height: "10px", 
              background: "#ff3b30", borderRadius: "50%", border: "2px solid white" 
            }}></span>
          )}
        </button>
      </div>

      {/* 2. Full-Screen Overlay & Side Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            style={{ 
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", 
              zIndex: 9998, backdropFilter: "blur(4px)" 
            }}
          />
          
          {/* Side Drawer */}
          <div style={{ 
            position: "fixed", top: 0, right: 0, width: "85%", maxWidth: "360px", 
            height: "100%", background: "var(--surface-pure)", zIndex: 9999,
            boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column",
            animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}>
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            
            <div style={{ 
              padding: "1.5rem", borderBottom: "1px solid var(--outline-variant)", 
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--surface-low)"
            }}>
              <h2 className="title-md" style={{ fontWeight: 800 }}>{t.title}</h2>
              <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ padding: "0.5rem 1.5rem", display: "flex", justifyContent: "flex-end" }}>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} style={{ 
                  background: "transparent", border: "none", color: "var(--brand-primary)", 
                  fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" 
                }}>
                  {t.markAll}
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem" }}>
              {notifications.length === 0 ? (
                <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--brand-on-surface-variant)", fontSize: "0.9rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔔</div>
                  {t.empty}
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      handleMarkAsRead(n.id);
                      if (n.link) window.location.href = n.link;
                    }}
                    style={{ 
                      padding: "1.25rem 1rem", borderBottom: "1px solid var(--outline-variant)",
                      cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px",
                      background: n.is_read ? "transparent" : "rgba(156, 64, 0, 0.04)",
                      borderLeft: n.is_read ? "none" : "4px solid var(--brand-primary)"
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--brand-on-surface)" }}>{n.title}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--brand-on-surface-variant)", lineHeight: 1.4 }}>{n.message}</span>
                    <span style={{ fontSize: "0.7rem", color: "#999", marginTop: "4px" }}>
                      {new Date(n.created_at).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: "1.5rem", borderTop: "1px solid var(--outline-variant)" }}>
              <button onClick={() => setIsOpen(false)} className="btn-primary" style={{ width: "100%" }}>{t.close}</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
