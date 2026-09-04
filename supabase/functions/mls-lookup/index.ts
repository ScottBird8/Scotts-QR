// Looks up a listing by MLS number from the Iron County Board of REALTORS
// Spark API feed and returns it mapped to this site's property fields,
// with photos already downloaded and re-hosted in our own Storage bucket
// (so the site never depends on Spark's CDN staying up).
//
// Requires two secrets set on this function (Project Settings -> Edge
// Functions -> Secrets, or via the function's own settings page):
//   SPARK_ACCESS_TOKEN         - the access token from Iron County's approval email
//   SUPABASE_SERVICE_ROLE_KEY  - usually already available by default in Supabase
//                                 Edge Functions; only add manually if missing
//
// Only callable by a signed-in admin (verifies the caller's Supabase Auth
// session) - never public, since it spends metered Spark API usage.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SPARK_TOKEN = Deno.env.get('SPARK_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function money(n: number | null | undefined): string {
  if (n == null) return '';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function mapStatus(standardStatus: string | null, mlsStatus: string | null): string {
  const s = (standardStatus || mlsStatus || '').toLowerCase();
  if (s.includes('pending') || s.includes('under contract')) return 'Pending';
  if (s.includes('closed') || s.includes('sold')) return 'Sold';
  return 'Active';
}

function mapType(propertyType: string | null, propertySubType: string | null): string {
  const s = ((propertyType || '') + ' ' + (propertySubType || '')).toLowerCase();
  if (s.includes('land') || s.includes('farm') || s.includes('lot')) return 'land';
  if (s.includes('commercial') || s.includes('business')) return 'business';
  return 'residential';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ error: 'Not authenticated' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: 'Not authenticated' }, 401);

    const { mlsNumber } = await req.json();
    if (!mlsNumber || typeof mlsNumber !== 'string') return json({ error: 'mlsNumber is required' }, 400);
    const cleanMls = mlsNumber.trim().replace(/'/g, '');

    const sparkHeaders = { Authorization: `Bearer ${SPARK_TOKEN}`, Accept: 'application/json' };

    const filter = `ListingId Eq '${cleanMls}'`;
    const listingRes = await fetch(
      `https://replication.sparkapi.com/v1/listings?_filter=${encodeURIComponent(filter)}`,
      { headers: sparkHeaders }
    );
    const listingJson = await listingRes.json();
    if (!listingRes.ok || !listingJson?.D?.Success) {
      return json({ error: listingJson?.D?.Message || 'Spark API request failed' }, 502);
    }
    const listing = listingJson.D.Results?.[0];
    if (!listing) return json({ error: `No listing found for MLS #${cleanMls}` }, 404);
    const f = listing.StandardFields || {};

    // Photos: fetch the list, download each, re-upload into our own Storage.
    let heroUrl: string | null = null;
    const galleryUrls: string[] = [];
    try {
      const photosRes = await fetch(
        `https://replication.sparkapi.com/v1/listings/${listing.Id}/photos`,
        { headers: sparkHeaders }
      );
      const photosJson = await photosRes.json();
      // Spark's _limit param doesn't reliably cap this sub-resource, so the
      // cap is enforced here instead: 1 hero + up to 10 gallery photos,
      // matching the site's existing photo limits everywhere else.
      const allPhotos = photosJson?.D?.Results || [];
      const primary = allPhotos.find((p: any) => p.Primary);
      const rest = allPhotos.filter((p: any) => !p.Primary).slice(0, 10);
      const photos = primary ? [primary, ...rest] : allPhotos.slice(0, 11);
      for (const p of photos) {
        const srcUrl = p.Uri1600 || p.UriLarge || p.Uri1024 || p.Uri800;
        if (!srcUrl) continue;
        try {
          const imgRes = await fetch(srcUrl);
          if (!imgRes.ok) continue;
          const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
          const path = `mls-import/${cleanMls}/${p.Id}.jpg`;
          const { error: upErr } = await admin.storage
            .from('property-photos')
            .upload(path, imgBuf, { contentType: 'image/jpeg', upsert: true });
          if (upErr) continue;
          const { data: pub } = admin.storage.from('property-photos').getPublicUrl(path);
          if (p.Primary) heroUrl = pub.publicUrl;
          else galleryUrls.push(pub.publicUrl);
        } catch (_e) { /* skip this photo, keep going */ }
      }
    } catch (_e) { /* no photos available - not fatal */ }
    if (!heroUrl && galleryUrls.length) heroUrl = galleryUrls.shift()!;

    const rooms = Object.entries(f.RoomType || {})
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    const facts: [string, string][] = [];
    if (f.MLSAreaMajor) facts.push(['MLS Area', f.MLSAreaMajor]);
    if (f.ParcelNumber) facts.push(['Parcel #', f.ParcelNumber]);
    if (f.ElementarySchool) facts.push(['Elementary School', f.ElementarySchool]);
    if (f.MiddleOrJuniorSchool) facts.push(['Middle School', f.MiddleOrJuniorSchool]);
    if (f.HighSchool) facts.push(['High School', f.HighSchool]);
    if (f.GarageSpaces) facts.push(['Garage Spaces', String(f.GarageSpaces)]);

    const remarks = (f.PublicRemarks || '').trim();
    const blurb = remarks.length > 160 ? remarks.slice(0, 157).replace(/\s+\S*$/, '') + '…' : remarks;

    const cityLine = [f.City, f.StateOrProvince].filter(Boolean).join(', ') + (f.PostalCode ? ' ' + f.PostalCode : '');

    return json({
      data: {
        addr: f.UnparsedFirstLineAddress || '',
        city: cityLine,
        price: money(f.ListPrice ?? f.CurrentPrice),
        status: mapStatus(f.StandardStatus, f.MlsStatus),
        type: mapType(f.PropertyType, f.PropertySubType),
        mls: f.ListingId || cleanMls,
        beds: f.BedsTotal != null ? String(f.BedsTotal) : '',
        baths: f.BathroomsTotalDecimal != null ? String(f.BathroomsTotalDecimal) : '',
        sqft: f.BuildingAreaTotal ? Math.round(f.BuildingAreaTotal).toLocaleString('en-US') : '',
        lot: f.LotSizeAcres ? `${f.LotSizeAcres} ac` : '',
        subdivision: f.SubdivisionName || '',
        year_built: f.YearBuilt ? String(f.YearBuilt) : '',
        listed: (f.OnMarketDate || f.ListingContractDate || '').slice(0, 10),
        blurb,
        public_remarks: f.PublicRemarks || '',
        facts,
        rooms,
        lat: f.Latitude ?? null,
        lng: f.Longitude ?? null,
        hero_photo_url: heroUrl,
        gallery_photo_urls: galleryUrls,
      },
    });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
