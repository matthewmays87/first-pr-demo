# Chicken Tinder 🍗

Two phones, one deck of nearby restaurants. Swipe right on the same place and you both get an "It's a Match!" screen.

- **App:** Expo (React Native) + Expo Router
- **Backend:** Supabase (Postgres, Realtime, anonymous auth, one edge function)
- **Data:** Google Places API (New), called **once per room**, server-side

## How it works

1. The host picks a radius, price, and cuisine. `create_room()` makes a 4-character code.
2. The host's phone calls the `places-nearby` edge function. It runs one Nearby Search, resolves one photo per place, and saves the deck onto the room row. The Google key never ships in the app.
3. The guest enters the code. `join_room()` adds them, and they read the deck straight from the database.
4. Each swipe is a row in `swipes`. A database trigger inserts into `matches` the moment both people have liked the same place. Both phones listen to `matches` through Realtime, so the match screen pops up on both at once.

## One-time setup

### 1. Supabase project
1. Create a project at supabase.com.
2. **Authentication → Sign In / Providers → turn on "Anonymous sign-ins".**
3. Run the schema in one of two ways:
   - paste `supabase/migrations/20261119000000_init.sql` into the SQL Editor, **or**
   - `npx supabase login && npx supabase link --project-ref YOUR_REF && npx supabase db push`

### 2. Google Places
1. In Google Cloud, enable **Places API (New)** and create an API key. Restrict the key to that API.
2. Give the key to Supabase and deploy the function:
   ```bash
   npx supabase secrets set GOOGLE_PLACES_API_KEY=your_key
   npx supabase functions deploy places-nearby
   ```

### 3. App
```bash
cp .env.example .env.local     # fill in URL + publishable key from Project Settings → API Keys
npm install
npx expo start
```

**Running on your phones:** gesture-handler, reanimated, and expo-location are native modules. If Expo Go complains about versions, make a development build: `npx eas-cli@latest build --profile development`, or `npx expo run:ios` / `npx expo run:android` locally.

## Layout

```
src/
  app/                  screens (Expo Router)
    _layout.tsx         anonymous sign-in + navigation stack
    index.tsx           Create / Join
    create.tsx          radius, price, cuisine → create_room()
    join.tsx            4-char code → join_room()
    room/[id].tsx       waiting → swipe deck → match modal
  components/           SwipeDeck, RestaurantCard, MatchModal, Button, Chip
  hooks/                useRoom (live room row), useMatches (live matches)
  lib/                  supabase client, types, constants, maps links
supabase/
  migrations/           tables, trigger, row-level security, realtime
  functions/places-nearby/   the single Google call
```

## Cost notes

- Each room makes **1 Nearby Search plus up to 20 photo lookups**, and both happen on the host's side only. The guest makes zero Google calls.
- Requesting `rating`, `priceLevel`, and `regularOpeningHours` puts Nearby Search on Google's higher-priced tier. Check Google's current Places pricing; casual two-person use usually stays inside the monthly free allowance.
- The edge function won't call Google again for a room that already has its deck.

## Known limits

- Nearby Search can't filter by price, so price is filtered after the results come back. Places with no listed price are kept. A strict price filter can leave fewer than 20 cards.
- Google caps the radius at about 31 miles.
