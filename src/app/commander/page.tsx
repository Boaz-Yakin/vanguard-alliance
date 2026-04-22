"use client";

import { useState, useEffect } from "react";
import { DealService, CreateDealInput } from "@/services/dealService";
import { ImageService } from "@/services/imageService";
import { supabase } from "@/lib/supabaseClient";

export default function CommanderPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [existingDeals, setExistingDeals] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialForm = {
    item_name: "",
    item_name_en: "",
    category: "Meat",
    price_per_unit: 0,
    unit: "box",
    target_volume: 100,
    image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    supplier_id: "",
    expires_in_days: 7,
    is_private: false,
  };
  const [form, setForm] = useState(initialForm);

  const [tiers, setTiers] = useState([
    { threshold_pct: 0.3, discount_rate: 0.05 },
    { threshold_pct: 0.7, discount_rate: 0.10 },
    { threshold_pct: 1.0, discount_rate: 0.15 },
  ]);

  const loadData = async () => {
    const { data: sups } = await supabase.from("suppliers").select("*");
    if (sups) {
      setSuppliers(sups);
      if (sups.length > 0 && !form.supplier_id) setForm((f) => ({ ...f, supplier_id: sups[0].id }));
    }
    const deals = await DealService.getAllDeals();
    setExistingDeals(deals);
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) await loadData();
    }
    init();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const optimized = await ImageService.optimizeForUpload(file);
      const fileName = ImageService.generateStrategicFileName(file.name);
      
      // Upload to Supabase Storage (assuming bucket 'products' exists)
      const { data, error } = await supabase.storage
        .from("products")
        .upload(fileName, optimized);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(fileName);

      setForm((f) => ({ ...f, image_url: publicUrl }));
    } catch (err) {
      console.warn("Storage not configured? Using fallback image.", err);
      alert("이미지 업로드에 실패했습니다. Storage 설정을 확인하거나 URL을 직접 입력해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + form.expires_in_days);

    if (!form.supplier_id) {
      alert("공급사를 선택해 주세요. (Supplier selection is required)");
      return;
    }

    const input: CreateDealInput = {
      ...form,
      expires_at: expires_at.toISOString(),
      tiers: tiers,
    };

    let res;
    if (editingId) {
      res = await DealService.updateDeal(editingId, input);
    } else {
      res = await DealService.createDeal(input);
    }

    if (res.success) {
      alert(editingId ? "작전 정보가 수정되었습니다." : "전략적 공동구매 아이템이 성공적으로 게시되었습니다.");
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    } else {
      alert("처리 실패: " + JSON.stringify(res.error));
    }
    setLoading(false);
  };

  const handleEdit = (deal: any) => {
    setEditingId(deal.id);
    setForm({
      item_name: deal.item_name,
      item_name_en: deal.item_name_en || "",
      category: deal.category,
      price_per_unit: deal.price_per_unit,
      unit: deal.unit,
      target_volume: deal.target_volume,
      image_url: deal.image_url,
      supplier_id: deal.supplier_id,
      expires_in_days: 7, // Default back for edit
      is_private: deal.is_private,
    });
    if (deal.deal_tiers) {
      // Ensure unique tiers by threshold to prevent UI explosion
      const uniqueTiers = Array.from(new Map(deal.deal_tiers.map((t: any) => [t.threshold_pct, t])).values());
      setTiers(uniqueTiers.map((t: any) => ({
        threshold_pct: t.threshold_pct,
        discount_rate: t.discount_rate
      })));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!user || user.email !== 'boaznyakin@gmail.com') {
    return (
      <div className="container flex-col items-center justify-center" style={{ padding: "2rem", textAlign: "center", minHeight: "80vh" }}>
        <h1 className="display-lg mb-4" style={{ color: "var(--primary)" }}>RESTRICTED AREA</h1>
        <p className="body-lg mb-8">
          {user ? `접속 권한이 없습니다. (${user.email})` : "사령부 접속을 위해 관리자 인증이 필요합니다."}
        </p>
        <button 
          onClick={() => window.location.href = user ? "/" : "/login"}
          className="btn-primary"
          style={{ padding: "1rem 2rem" }}
        >
          {user ? "홈으로 돌아가기" : "관리자 로그인"}
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "2rem" }}>
      <header className="flex justify-between items-start mb-8 commander-header">
        <div>
          <h1 className="display-lg text-primary">VANGUARD COMMAND</h1>
          <p className="body-lg">{editingId ? "작전을 수정 중입니다 (ID: " + editingId.slice(0,8) + ")" : "새로운 공동구매 작전을 개시하십시오."}</p>
        </div>
        <div className="flex gap-2 commander-header-buttons">
          {editingId && (
            <button 
              type="button"
              onClick={() => { setEditingId(null); setForm(initialForm); }}
              className="btn-outline"
              style={{ padding: "0.5rem 1rem", borderColor: "var(--error)", color: "#d32f2f" }}
            >
              편집 취소
            </button>
          )}
          <button 
            type="button"
            onClick={() => window.location.href = "/"}
            className="btn-outline"
            style={{ padding: "0.5rem 1rem" }}
          >
            공구화면보기
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-col gap-4">
        <section className="section" style={{ background: "var(--surface-container-lowest)" }}>
          <h2 className="headline-md mb-4">기본 정보</h2>
          
          <div className="flex-col gap-2 mb-4">
            <label className="label-md">아이템 이름 (KO)</label>
            <input 
              className="commander-input"
              value={form.item_name}
              onChange={e => setForm({...form, item_name: e.target.value})}
              placeholder="예: 제주산 햇양파 20kg"
              required
            />
          </div>

          <div className="flex-col gap-2 mb-4">
            <label className="label-md">Item Name (EN)</label>
            <input 
              className="commander-input"
              value={form.item_name_en}
              onChange={e => setForm({...form, item_name_en: e.target.value})}
              placeholder="e.g. Fresh Jeju Onion 20kg"
              required
            />
          </div>

          <div className="commander-grid">
            <div className="flex-col gap-2">
              <label className="label-md">카테고리</label>
              <select 
                className="commander-input"
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
              >
                <option value="Meat">정육/계란</option>
                <option value="Veggie">농산물</option>
                <option value="Sauce">소스/오일</option>
                <option value="Elite">엘리트 전용</option>
              </select>
            </div>
            <div className="flex-col gap-2">
              <label className="label-md">공급업체</label>
              <select 
                className="commander-input"
                value={form.supplier_id}
                onChange={e => setForm({...form, supplier_id: e.target.value})}
                required
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex-col gap-2 mt-4">
            <label className="label-md">작전 등급</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input 
                type="checkbox"
                id="is_private"
                style={{ width: "20px", height: "20px" }}
                checked={form.is_private}
                onChange={e => setForm({...form, is_private: e.target.checked})}
              />
              <label htmlFor="is_private" className="body-md" style={{ color: form.is_private ? "var(--primary)" : "inherit", fontWeight: form.is_private ? 700 : 400 }}>
                엘리트 전용 (동맹 공동 구매 섹션에만 노출)
              </label>
            </div>
          </div>
        </section>

        <section className="section" style={{ background: "var(--surface-container-lowest)" }}>
          <h2 className="headline-md mb-4">전략적 가격 및 물량</h2>
          
          <div className="commander-grid mb-4">
            <div className="flex-col gap-2">
              <label className="label-md">단가 ($)</label>
              <input 
                type="number" step="0.01"
                className="commander-input"
                value={form.price_per_unit}
                onChange={e => setForm({...form, price_per_unit: Number(e.target.value)})}
                required
              />
            </div>
            <div className="flex-col gap-2">
              <label className="label-md">단위</label>
              <input 
                className="commander-input"
                value={form.unit}
                onChange={e => setForm({...form, unit: e.target.value})}
                placeholder="예: lb, box, kg"
                required
              />
            </div>
          </div>

          <div className="commander-grid">
            <div className="flex-col gap-2">
              <label className="label-md">목표 물량</label>
              <input 
                type="number"
                className="commander-input"
                value={form.target_volume}
                onChange={e => setForm({...form, target_volume: Number(e.target.value)})}
                required
              />
            </div>
            <div className="flex-col gap-2">
              <label className="label-md">진행 기간 (일)</label>
              <input 
                type="number"
                className="commander-input"
                value={form.expires_in_days}
                onChange={e => setForm({...form, expires_in_days: Number(e.target.value)})}
                required
              />
            </div>
          </div>
        </section>

        <section className="section" style={{ background: "var(--surface-container-lowest)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 className="headline-md">할인 전략 (Tiers)</h2>
            <button 
              type="button" 
              onClick={() => setTiers([])}
              className="btn-secondary"
              style={{ padding: "4px 12px", fontSize: "0.8rem", color: "var(--error)" }}
            >
              전체 삭제
            </button>
          </div>
          <div className="flex-col gap-4">
            {tiers.map((tier, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 40px", gap: "1rem", alignItems: "center" }}>
                <div className="flex-col gap-1">
                  <label className="label-md">달성도 (%)</label>
                  <input 
                    type="number" 
                    className="commander-input"
                    value={Math.round(tier.threshold_pct * 100)}
                    onChange={e => {
                      const newTiers = [...tiers];
                      newTiers[index].threshold_pct = Number(e.target.value) / 100;
                      setTiers(newTiers);
                    }}
                  />
                </div>
                <div className="flex-col gap-1">
                  <label className="label-md">할인율 (%)</label>
                  <input 
                    type="number"
                    className="commander-input"
                    value={Math.round(tier.discount_rate * 100)}
                    onChange={e => {
                      const newTiers = [...tiers];
                      newTiers[index].discount_rate = Number(e.target.value) / 100;
                      setTiers(newTiers);
                    }}
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setTiers(tiers.filter((_, i) => i !== index))}
                  style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "1.2rem", cursor: "pointer", marginTop: "1rem" }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => setTiers([...tiers, { threshold_pct: 1.0, discount_rate: 0.20 }])}
              style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
            >
              + 단계 추가
            </button>
          </div>
        </section>

        <section className="section" style={{ background: "var(--surface-container-lowest)" }}>
          <h2 className="headline-md mb-4">이미지 자산</h2>
          <div className="flex-col gap-4">
            <div style={{ 
              width: "100%", height: "200px", borderRadius: "var(--radius-md)", overflow: "hidden", 
              border: "1px solid var(--outline-variant)", background: "#ffffff",
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <img 
                src={form.image_url} 
                alt="Preview" 
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Select+Product+Image";
                }}
              />
            </div>

            <div className="flex-col gap-2">
              <label className="label-md">상품 이미지 업로드</label>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <input 
                  type="file" 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="body-md" 
                  style={{ flex: 1 }} 
                />
                {loading && <span className="label-sm" style={{ color: "var(--primary)" }}>업로드 중...</span>}
              </div>
              <p className="label-sm" style={{ opacity: 0.6 }}>* 고화질의 정방형 또는 가로형 이미지를 추천합니다.</p>
            </div>
          </div>
        </section>

        <button 
          type="submit" 
          className="btn-primary" 
          style={{ padding: "1.5rem", fontSize: "1.2rem", marginTop: "1rem" }}
          disabled={loading}
        >
          {loading ? "전략 전송 중..." : (editingId ? "작전 수정 (업데이트)" : "작전 개시 (아이템 게시)")}
        </button>
      </form>

      <section className="section mt-8" style={{ background: "var(--surface-container-lowest)" }}>
        <h2 className="headline-md mb-6">📢 작전 가시성 관제 (Exposure Control)</h2>
        
        <div className="flex-col gap-8">
          {/* Section 1: Public Deals */}
          <div>
            <h3 className="title-lg mb-3" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>🌐</span> 일반 공개 작전 (Public Hot Deals)
            </h3>
            <div className="flex-col gap-3">
              {existingDeals.filter(d => !d.is_private).map(deal => (
                <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--outline-variant)", flexWrap: "wrap" }}>
                  <img src={deal.image_url} style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover" }} />
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <div className="title-md">{deal.item_name}</div>
                    <div className="body-sm" style={{ opacity: 0.7 }}>{deal.suppliers?.name} | ${deal.price_per_unit}</div>
                  </div>
                  <button onClick={() => handleEdit(deal)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>편집</button>
                </div>
              ))}
              {existingDeals.filter(d => !d.is_private).length === 0 && <p className="body-md p-4" style={{ opacity: 0.5, textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: "8px" }}>진행 중인 공개 작전이 없습니다.</p>}
            </div>
          </div>

          {/* Section 2: Elite Private Deals */}
          <div>
            <h3 className="title-lg mb-3" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>🛡️</span> 엘리트 동맹 전용 작전 (Elite Alliance Only)
            </h3>
            <div className="flex-col gap-3">
              {existingDeals.filter(d => d.is_private).map(deal => (
                <div key={deal.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "var(--primary-container)", borderRadius: "var(--radius-md)", border: "1px solid var(--primary)", flexWrap: "wrap" }}>
                  <img src={deal.image_url} style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover" }} />
                  <div style={{ flex: 1, minWidth: "150px" }}>
                    <div className="title-md" style={{ color: "var(--on-primary-container)" }}>{deal.item_name}</div>
                    <div className="body-sm" style={{ color: "var(--on-primary-container)", opacity: 0.7 }}>{deal.suppliers?.name} | ${deal.price_per_unit}</div>
                  </div>
                  <button onClick={() => handleEdit(deal)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem", background: "white" }}>편집</button>
                </div>
              ))}
              {existingDeals.filter(d => d.is_private).length === 0 && <p className="body-md p-4" style={{ opacity: 0.5, textAlign: "center", border: "1px dashed var(--outline-variant)", borderRadius: "8px" }}>진행 중인 비공개 전용 작전이 없습니다.</p>}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .commander-input {
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--outline-variant);
          background: var(--surface);
          font-size: 1rem;
          color: var(--on-surface);
          width: 100%;
          box-sizing: border-box;
          max-width: 100%;
        }
        .commander-input:focus {
          outline: 2px solid var(--primary);
          border-color: transparent;
        }
        .commander-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1rem;
        }
        @media (max-width: 768px) {
          .commander-grid {
            grid-template-columns: 1fr;
          }
          .commander-header {
            flex-direction: column;
            align-items: stretch !important;
            gap: 1.5rem;
          }
          .commander-header-buttons {
             width: 100%;
             flex-direction: row;
             justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
