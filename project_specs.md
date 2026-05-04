# Project: Vanguard Alliance - Order Engine

## 🎯 Goal
Build a high-premium, high-conversion order application for "VANGUARD ALLIANCE" with a focus on user retention through points and group buying dynamics.

## ✨ Key Features
1. **Zero-Friction Order Routing (Vanguard Standard)**
   - **Digital Order Guide**: Custom "Tap-Tap-Order" inventory for each store owner.
   - **Routing Engine**: Automatically split a single cart into multiple supplier-specific orders.
   - **Multi-channel Dispatcher**: Send orders via Email (SendGrid), SMS (Twilio), or WhatsApp without requiring suppliers to install an app.
2. **Big Deal Volume Achievement (Vanguard Special)**
   - Aggregate demand for high-volume items.
   - Real-time participation tracking (0-100%).
   - Automatic dispatch to vendors upon reaching 100% volume.
3. **Global Standard (Multi-language)**
   - Support for Korean (KO) and English (EN) interfaces.

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
