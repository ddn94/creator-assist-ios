# Creator Assist (iOS)

React Native / Expo mobile app with feature parity against `creator-assist-new`.
Uses the same Supabase project (auth, RLS, RPCs, storage, exchange rates).

## Setup

```bash
cp .env.example .env
```

Fill:

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — staging values from the website
- `EXPO_PUBLIC_WEBSITE_URL` — website origin for account deletion + waitlist admin APIs
- `EXPO_PUBLIC_ADMIN_EMAILS` — same list as website `ADMIN_EMAILS` (shows Waitlist in Profile)

```bash
npm install
npx expo start
```

For waitlist admin and account deletion, run the website (or point `EXPO_PUBLIC_WEBSITE_URL` at staging/production).

## Parity with the website

- Auth (deep links `creatorassist://auth/callback`), waitlist join, landing FAQs, onboarding
- Creator + agency workspaces; content activity history + unsaved leave guard
- Tracker advance / revision; payments overdue badge; roster live deals / outstanding
- Profile platforms grid + coming-soon stubs; waitlist admin pagination
- **Product tour** after first onboarding (Skip / Next / Done)
- **P&L FX** — loads `exchange_rates`, display-currency picker (same logic as `lib/fx.ts`)

In Supabase Auth → URL configuration, allow the Expo redirect
(`npx uri-scheme list` / `Linking.createURL("auth/callback")`).

## Website companion APIs

- `POST /api/account/delete` — Bearer access token
- `GET /api/admin/waitlist` — Bearer access token + `ADMIN_EMAILS`
