// Travel Log data. The globe, the readouts and the log list are all drawn from this file.
//
// - `places`: every point on the globe, keyed by a short id. lat/lon in decimal degrees (N and E positive).
//   `country` is an ISO-3166 alpha-2 code; it drives the Countries readout.
// - `homes`: home base. Drawn as an ember pin; the current one pulses.
// - `trips`: each trip is an ordered list of stops (place ids). Ribbons connect consecutive stops.
//     mode 'air'  → a high arc above the globe
//     mode 'road' → a low, dashed ribbon that hugs the surface
//     mode 'rail' → a low, dash-dot ribbon
//     mode 'sea'  → a low, dotted ribbon (ferries)
//   `modes` optionally overrides the mode per leg (length = stops - 1).
//   Layover airports are left out on purpose: ribbons go destination to destination.
//   Set `crew: true` when Powder (CR-01) came along. Crew trips are drawn in amber.
//
// Public site: cities and months only. No addresses, bookings or friends' names.
// Entries marked `draft` still need confirming.

export type Mode = 'air' | 'road' | 'rail' | 'sea';
export type Place = { name: string; region: string; country: string; lat: number; lon: number };
export type Home = { place: string; from: string; to?: string; note?: string; draft?: boolean };
export type Trip = {
  id: string; title: string; date: string; stops: string[]; mode: Mode; modes?: Mode[];
  crew?: boolean; note?: string; draft?: boolean;
};

export const places: Record<string, Place> = {
  // United States
  rogers: { name: 'Rogers', region: 'AR', country: 'US', lat: 36.33, lon: -94.12 },
  austin: { name: 'Austin', region: 'TX', country: 'US', lat: 30.27, lon: -97.74 },
  dallas: { name: 'Dallas', region: 'TX', country: 'US', lat: 32.78, lon: -96.8 },
  denver: { name: 'Denver', region: 'CO', country: 'US', lat: 39.74, lon: -104.99 },
  sanfrancisco: { name: 'San Francisco', region: 'CA', country: 'US', lat: 37.77, lon: -122.42 },
  losangeles: { name: 'Los Angeles', region: 'CA', country: 'US', lat: 34.05, lon: -118.24 },
  sandiego: { name: 'San Diego', region: 'CA', country: 'US', lat: 32.72, lon: -117.16 },
  boston: { name: 'Boston', region: 'MA', country: 'US', lat: 42.36, lon: -71.06 },
  saco: { name: 'Saco / Biddeford', region: 'ME', country: 'US', lat: 43.49, lon: -70.45 },
  seattle: { name: 'Seattle', region: 'WA', country: 'US', lat: 47.61, lon: -122.33 },
  crestone: { name: 'Crestone', region: 'CO', country: 'US', lat: 37.99, lon: -105.7 },
  mulberry: { name: 'Mulberry Mountain', region: 'AR', country: 'US', lat: 35.71, lon: -93.8 },
  // Mexico
  tulum: { name: 'Tulum', region: 'Mexico', country: 'MX', lat: 20.21, lon: -87.46 },
  playa: { name: 'Playa del Carmen', region: 'Mexico', country: 'MX', lat: 20.63, lon: -87.08 },
  cozumel: { name: 'Cozumel', region: 'Mexico', country: 'MX', lat: 20.51, lon: -86.95 },
  // Europe
  london: { name: 'London', region: 'England', country: 'GB', lat: 51.51, lon: -0.13 },
  stockholm: { name: 'Stockholm', region: 'Sweden', country: 'SE', lat: 59.33, lon: 18.07 },
  thehague: { name: 'The Hague', region: 'Netherlands', country: 'NL', lat: 52.08, lon: 4.3 },
  paris: { name: 'Paris', region: 'France', country: 'FR', lat: 48.86, lon: 2.35 },
  dusseldorf: { name: 'Düsseldorf', region: 'Germany', country: 'DE', lat: 51.23, lon: 6.78 },
  // Asia
  tokyo: { name: 'Tokyo', region: 'Japan', country: 'JP', lat: 35.69, lon: 139.7 },
  hiroshima: { name: 'Hiroshima', region: 'Japan', country: 'JP', lat: 34.39, lon: 132.46 },
  ishigaki: { name: 'Ishigaki', region: 'Japan', country: 'JP', lat: 24.34, lon: 124.16 },
  hoian: { name: 'Hoi An', region: 'Vietnam', country: 'VN', lat: 15.88, lon: 108.33 },
  chiangmai: { name: 'Chiang Mai', region: 'Thailand', country: 'TH', lat: 18.79, lon: 98.99 },
  bangkok: { name: 'Bangkok', region: 'Thailand', country: 'TH', lat: 13.74, lon: 100.51 },
  siemreap: { name: 'Siem Reap', region: 'Cambodia', country: 'KH', lat: 13.36, lon: 103.86 },
  narita: { name: 'Narita', region: 'Japan', country: 'JP', lat: 35.78, lon: 140.32 },
};

export const homes: Home[] = [
  { place: 'seattle', from: '2026', note: 'Home base' },
];

export const trips: Trip[] = [
  {
    id: 'west26', title: 'West Coast, with Powder', date: '2026-10', crew: true,
    stops: ['crestone', 'denver', 'sanfrancisco', 'losangeles', 'sandiego', 'seattle', 'crestone', 'seattle'],
    mode: 'air', modes: ['road', 'air', 'air', 'rail', 'air', 'air', 'air'],
    note: 'Drove to Denver, flew to San Francisco and LA, train down the coast to San Diego, then up to Seattle.',
    draft: true, // Seattle → Crestone → Seattle legs drawn as air, mode unconfirmed.
  },
  {
    id: 'ne26', title: 'New England', date: '2026-07',
    stops: ['denver', 'boston', 'saco', 'boston', 'denver'],
    mode: 'air', modes: ['air', 'rail', 'rail', 'air'],
    note: 'Boston, then the train up the coast to Saco and Biddeford, Maine, and back the same way.',
  },
  {
    id: 'asia26', title: 'Asia, solo', date: '2026-05',
    stops: ['seattle', 'tokyo', 'hiroshima', 'ishigaki', 'hoian', 'chiangmai', 'bangkok', 'siemreap', 'narita', 'seattle'],
    mode: 'air', modes: ['air', 'rail', 'air', 'air', 'air', 'air', 'air', 'air', 'air'],
    note: 'Japan with friends, then solo south: Hiroshima and Miyajima, Ishigaki, Hoi An, Chiang Mai, Bangkok, Angkor. 25 days, 4 countries.',
    draft: true, // Origin (Seattle or Crestone?), return city and Tokyo arrival date unconfirmed.
  },
  {
    id: 'eu24', title: 'Europe', date: '2024-01',
    stops: ['austin', 'london', 'stockholm', 'thehague', 'paris', 'dusseldorf', 'thehague', 'london', 'austin'],
    mode: 'air', modes: ['air', 'air', 'air', 'rail', 'rail', 'rail', 'air', 'air'],
    note: 'London for Google Generate, then a loop to see friends: Stockholm, The Hague, Paris, Düsseldorf, back through The Hague and London.',
    draft: true, // The Hague → London mode unconfirmed; drawn as air.
  },
  {
    id: 'mx10', title: 'Riviera Maya', date: '2010',
    stops: ['rogers', 'tulum', 'playa', 'cozumel', 'rogers'],
    mode: 'air', modes: ['air', 'road', 'sea', 'air'],
    note: 'A family trip as a kid: Tulum, Playa del Carmen and Cozumel.',
    draft: true, // Year approximate; origin (Rogers vs Houston) and stop order assumed.
  },
  { id: 'fo04', title: 'Wakaan', date: '2024', stops: ['austin', 'dallas', 'rogers', 'mulberry'], mode: 'road', note: 'Music weekend in the Ozarks, driven up through Dallas and Rogers.', draft: true /* year unconfirmed */ },
];
