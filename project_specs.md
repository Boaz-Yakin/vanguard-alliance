# Project: Vanguard Alliance - Order Engine

## 🎯 Goal
Build a high-premium, high-conversion order application for "VANGUARD ALLIANCE" with a focus on user retention through points and group buying dynamics.

## ✨ Key Features
1. **Zero-Friction Order Routing (Vanguard Standard)**
   - **Digital Order Guide**: Custom "Tap-Tap-Order" inventory for each store owner.
   - **Routing Engine**: Automatically split a single cart into multiple supplier-specific orders.
   - **Multi-channel Dispatcher**: Send orders via Email (SendGrid), SMS (Twilio), or WhatsApp without requiring suppliers to install an app.
2. **User Point & Level System (Vanguard Special)**
   - Accumulate points on every purchase.
   - Store "Trust Scores" and "Levels" to unlock better group-buy deals.
3. **AI-Driven Group Buying**
   - Automatically detect high-volume items (e.g., cooking oil) and suggest group buys to nearby stores.
   - Real-time progress tracking for group discounts.
4. **Global Standard (Multi-language)**
   - Support for Korean (KO) and English (EN) interfaces to serve a diverse set of store owners and suppliers.

## 🛠 Tech Stack
- **Frontend**: Next.js (App Router, TypeScript)
- **Styling**: Vanilla CSS (Premium & Mobile-optimized)
- **Backend/DB**: Supabase (Auth, Postgres, Edge Functions for Routing)
- **Communication APIs**: SendGrid (Email), Twilio (SMS/WhatsApp)
- **Architecture**: Blueprints-Brains-Engine (CoreRules standard)

## ✅ Definition of Done
- Functional order flow (Product -> Group -> Point -> Payment Mock).
- Point calculation logic in database/API.
- Real-time group counter update.
- Fully responsive and visually "WOW" UI.
