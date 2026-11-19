// The ONE place that talks to Google. The host's phone calls this once per room;
// it runs Nearby Search, resolves one photo per restaurant, and saves the deck
// onto the room row. The guest's phone just reads the deck from the database.
//
// Deploy:  npx supabase functions deploy places-nearby
// Secret:  npx supabase secrets set GOOGLE_PLACES_API_KEY=...

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";
const METERS_PER_MILE = 1609.344;
const MAX_RADIUS_METERS = 50000; // Google's limit (~31 mi)

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.primaryTypeDisplayName",
  "places.regularOpeningHours",
  "places.photos",
  "places.location",
].join(",");

type GooglePlace = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: { name: string }[];
  location?: { latitude: number; longitude: number };
};

// Turns a photo resource name into a direct image URL so the app never needs the API key.
async function resolvePhoto(photoName: string): Promise<string | null> {
  try {
    const url =
      `https://places.googleapis.com/v1/${photoName}/media` +
      `?maxWidthPx=800&skipHttpRedirect=true&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    return body.photoUri ?? null;
  } catch {
    return null;
  }
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (!GOOGLE_KEY) {
      return Response.json({ error: "GOOGLE_PLACES_API_KEY is not set" }, { status: 500 });
    }

    const { room_id } = await req.json().catch(() => ({}));
    if (!room_id) return Response.json({ error: "room_id is required" }, { status: 400 });

    // ctx.supabase runs as the caller, so RLS applies (only room members can read it).
    const { data: room, error } = await ctx.supabase
      .from("rooms")
      .select("*")
      .eq("id", room_id)
      .single();
    if (error || !room) return Response.json({ error: "Room not found" }, { status: 404 });

    if (room.host_id !== ctx.jwtClaims?.sub) {
      return Response.json({ error: "Only the host can load restaurants" }, { status: 403 });
    }

    // Already fetched? Don't pay Google twice.
    if (Array.isArray(room.restaurants) && room.restaurants.length > 0) {
      return Response.json({ count: room.restaurants.length, cached: true });
    }

    if (room.lat == null || room.lng == null) {
      return Response.json({ error: "Room has no location" }, { status: 400 });
    }

    const googleRes = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: [room.cuisine ?? "restaurant"],
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: room.lat, longitude: room.lng },
            radius: Math.min(room.radius_miles * METERS_PER_MILE, MAX_RADIUS_METERS),
          },
        },
      }),
    });

    if (!googleRes.ok) {
      console.error("Google Places error", googleRes.status, await googleRes.text());
      return Response.json({ error: "Google Places request failed" }, { status: 502 });
    }

    const { places = [] } = (await googleRes.json()) as { places?: GooglePlace[] };

    // Nearby Search can't filter by price, so do it here.
    // Places with no price info are kept (lots of good spots don't list one).
    const wanted: string[] = room.price_levels ?? [];
    const filtered = places.filter(
      (p) => wanted.length === 0 || !p.priceLevel || wanted.includes(p.priceLevel),
    );

    if (filtered.length === 0) {
      return Response.json(
        { error: "No restaurants matched. Try a bigger radius or different filters." },
        { status: 404 },
      );
    }

    const restaurants = await Promise.all(
      filtered.map(async (p) => ({
        id: p.id,
        name: p.displayName?.text ?? "Unknown",
        address: p.formattedAddress ?? "",
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        priceLevel: p.priceLevel ?? null,
        cuisine: p.primaryTypeDisplayName?.text ?? null,
        hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
        photoUrl: p.photos?.[0]?.name ? await resolvePhoto(p.photos[0].name) : null,
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
      })),
    );

    const { error: updateError } = await ctx.supabase
      .from("rooms")
      .update({ restaurants, status: "active" })
      .eq("id", room_id);

    if (updateError) {
      console.error("Room update failed", updateError);
      return Response.json({ error: "Could not save restaurants" }, { status: 500 });
    }

    return Response.json({ count: restaurants.length, cached: false });
  }),
};
