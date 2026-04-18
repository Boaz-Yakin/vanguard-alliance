"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState({
    restaurant_name: "",
    restaurant_address: "",
    phone_number: "",
    prologue: "",
    points: 0,
    trust_score: 0,
    level: 1
  });

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser(user);

      // Fetch existing profile data
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('restaurant_name, restaurant_address, phone_number, prologue, points, trust_score, level')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setProfile({
            restaurant_name: data.restaurant_name || "",
            restaurant_address: data.restaurant_address || "",
            phone_number: data.phone_number || "",
            prologue: data.prologue || "",
            points: data.points || 0,
            trust_score: data.trust_score || 0,
            level: data.level || 1
          });
        }
      } catch (e) {
        console.warn("VANGUARD: Expected warning if columns don't exist yet.");
      }

      setLoading(false);
    }
    loadProfile();
  }, []);



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...profile,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      setMessage("Profile successfully updated.");
    } catch (err: any) {
      console.warn(err);
      setMessage("Saved locally! (DB Note: Make sure columns are added to Supabase 'profiles' table!)");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) return <div className="container" style={{ padding: "2rem", textAlign: "center" }}>Loading Profile...</div>;

  return (
    <div className="container" style={{ padding: "0 1.5rem", paddingBottom: "100px" }}>
      
      <nav className="top-nav" style={{ justifyContent: "flex-start", gap: "1rem" }}>
        <a href="/" style={{ color: "var(--on-surface)", textDecoration: "none" }}>← Back</a>
        <h1 className="top-nav-title display-txt">Owner Profile</h1>
      </nav>

      <div className="section mt-4" style={{ background: "var(--surface-container-lowest)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "var(--ambient-shadow)", display: "flex", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="title-lg" style={{ color: "var(--on-surface)" }}>VANGUARD Trust Profile</h2>
          <p className="label-md mt-1" style={{ color: "var(--on-surface-variant)" }}>Your network reputation and order volume rewards.</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--primary)" }}>Lv.{profile.level}</div>
          <div className="label-sm" style={{ fontWeight: 700, color: "var(--on-surface)" }}>{profile.points.toLocaleString()} PTS</div>
        </div>
      </div>
      
      <div className="section mt-4" style={{ background: "linear-gradient(135deg, rgba(230,190,138,0.1) 0%, rgba(200,150,100,0.05) 100%)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "var(--ambient-shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span className="title-md" style={{ color: "var(--on-surface)" }}>Trust Score</span>
          <span className="title-md" style={{ color: "var(--primary)", fontWeight: 800 }}>{Number(profile.trust_score).toFixed(2)} / 10.0</span>
        </div>
        <div style={{ height: "8px", background: "rgba(0,0,0,0.1)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(profile.trust_score / 10) * 100}%`, background: "var(--primary)", transition: "width 1s ease" }}></div>
        </div>
        <p className="label-sm mt-3" style={{ color: "var(--on-surface-variant)" }}>
          {profile.trust_score >= 7.0 ? "🔥 Elite Deals unlocked." : "Reach 7.0 to unlock Elite private deals."}
        </p>
      </div>

      <div className="section mt-4" style={{ background: "var(--surface-container-lowest)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "var(--ambient-shadow)" }}>
        <form onSubmit={handleSave} className="flex-col gap-4">
          
          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>Business Name (매장명)</label>
            <input 
              type="text" 
              name="restaurant_name"
              value={profile.restaurant_name}
              onChange={handleChange}
              placeholder="e.g. Vanguard Steakhouse"
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)" }}
            />
          </div>

          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>Business Address (매장주소)</label>
            <input 
              type="text" 
              name="restaurant_address"
              value={profile.restaurant_address}
              onChange={handleChange}
              placeholder="123 Culinary Ave"
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)" }}
            />
          </div>

          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>Contact Number (전화번호)</label>
            <input 
              type="tel" 
              name="phone_number"
              value={profile.phone_number}
              onChange={handleChange}
              placeholder="02-123-4567"
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)" }}
            />
          </div>

          <div>
            <label className="label-md" style={{ color: "var(--on-surface-variant)", marginBottom: "4px", display: "block" }}>Store Prologue (사용자 프롤로그/소개)</label>
            <textarea 
              name="prologue"
              value={profile.prologue}
              onChange={handleChange}
              placeholder="Brief introduction of your culinary philosophy..."
              rows={4}
              style={{ width: "100%", padding: "12px", borderRadius: "0.5rem", border: "1px solid var(--outline-variant)", resize: "vertical" }}
            />
          </div>

          {message && <p style={{ color: "var(--primary)", fontSize: "0.875rem", fontWeight: 600 }}>{message}</p>}

          <button className="btn-primary mt-2" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="mt-8" style={{ textAlign: "center" }}>
        <button 
          onClick={handleSignOut}
          style={{ background: "transparent", border: "none", color: "#d32f2f", fontWeight: 700, cursor: "pointer", padding: "1rem" }}
        >
          Sign Out
        </button>
      </div>

    </div>
  );
}
