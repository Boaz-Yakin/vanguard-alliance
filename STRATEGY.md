# STRATEGY: VANGUARD Order Engine (v1.1)

## ⚔️ Commander's Intent
To establish "VANGUARD ALLIANCE" as the dominant order routing platform by eliminating all technical friction for store owners and creating a high-trust, data-driven ecosystem.

## 🎯 Strategic Pillars
1. **The Frictionless Input (Zero-Entry):** Use the specialized Regex & AI hybrid parser to allow human-style ordering.
2. **The Trust Engine (Loyalty):** Treat every order as a trust-building event. Points and Levels are not features; they are the currency of the alliance.
3. **The Multi-Channel Dispatch:** Ensure suppliers receive orders in the most convenient format (PDF via Email/SMS) without changing their existing workflow.
4. **Resource Optimization Protocol:** All visual assets must be compressed (WebP/Client-side) to ensure infrastructure longevity and zero-friction UX.
5. **Unified Group Buy Architecture (v1.1):** A single, clean group buy feed — no redundant layers. One data source, one rendering pipeline.

## 🗺️ Execution Roadmap (The Critical Path)

### Phase 1.0: Foundations of Victory ✅
- **Goal:** Functional end-to-end data flow with premium UI.
- **Success Metric:** Order recorded in DB -> Supplier Mapped -> Points Awarded -> Success Badge Shown.
- **Status:** COMPLETE.

### Phase 1.1: Fulfillment & Dispatch
- **Goal:** Real-world connectivity.
- **Action E:** PDF generation (Client-side) & Email Dispatch (Edge Functions).
- **Target:** 100% automated order relay to vendors.

### Phase 2.0: Economic Domination ✅ (Simplified)
- **Goal:** Unified Group Buying.
- **Previous:** Dual-feed architecture (DealService + GroupBuyingService) — redundant.
- **Current (v1.1):** Single unified feed powered by DealService. GroupBuyingService & GroupDeals component eliminated.
- **Mechanism:** Deal tiers with progressive discount unlocks via single `deals` table.

## 📋 Architecture Changes (v1.1 — Simplification Sprint)
- **REMOVED:** `src/components/GroupDeals.tsx` — redundant dual-feed component
- **REMOVED:** `src/services/groupBuyingService.ts` — duplicate of DealService queries
- **UNIFIED:** `page.tsx` now renders all deals from a single `DealService.getActiveDeals()` call
- **INLINED:** Discount rate calculation moved to local `getCurrentDiscountRate()` helper

## 🛡️ Risk Management
- **Risk:** Database latency or downtime.
- **Mitigation:** Use Supabase's real-time features and local storage caching for active inputs.
- **Risk:** Parsing errors leading to wrong orders.
- **Mitigation:** Always show "Order Analysis Result (Preview)" and require confirmation before dispatch.

---
**Strategist:** Jegal (Commander)
**Date:** 2026-04-28
**Status:** ACTIVE
