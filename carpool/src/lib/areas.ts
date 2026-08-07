// Bangalore areas mapped to travel corridors toward Polaris School of
// Technology, Whitefield. `minutes` is a weekend-morning drive estimate to
// the venue — deliberately conservative, used only to suggest leave-by times.

export type CorridorKey =
  | "near"
  | "southeast"
  | "centraleast"
  | "northeast"
  | "west"
  | "other";

export interface Corridor {
  key: CorridorKey;
  name: string;
  routeHint: string;
}

export const CORRIDORS: Corridor[] = [
  {
    key: "near",
    name: "Near the venue",
    routeHint: "Whitefield / ITPL side — short hop",
  },
  {
    key: "southeast",
    name: "South-East corridor",
    routeHint: "via ORR / Sarjapur Road / Marathahalli",
  },
  {
    key: "centraleast",
    name: "Central-East corridor",
    routeHint: "via Old Airport Road / Varthur Road",
  },
  {
    key: "northeast",
    name: "North-East corridor",
    routeHint: "via KR Puram / Hoskote Road",
  },
  {
    key: "west",
    name: "West & Central corridor",
    routeHint: "longer routes — via ORR or city center",
  },
  {
    key: "other",
    name: "Other areas",
    routeHint: "coordinate the route on WhatsApp",
  },
];

export interface Area {
  key: string;
  name: string;
  corridor: CorridorKey;
  minutes: number;
}

export const AREAS: Area[] = [
  // Near the venue
  { key: "whitefield", name: "Whitefield", corridor: "near", minutes: 15 },
  { key: "itpl", name: "ITPL / EPIP Zone", corridor: "near", minutes: 15 },
  { key: "kadugodi", name: "Kadugodi", corridor: "near", minutes: 15 },
  { key: "hoodi", name: "Hoodi", corridor: "near", minutes: 20 },
  { key: "brookefield", name: "Brookefield", corridor: "near", minutes: 20 },
  { key: "kundalahalli", name: "Kundalahalli", corridor: "near", minutes: 20 },
  { key: "varthur", name: "Varthur", corridor: "near", minutes: 25 },
  { key: "mahadevapura", name: "Mahadevapura", corridor: "near", minutes: 25 },
  { key: "marathahalli", name: "Marathahalli", corridor: "near", minutes: 30 },

  // South-East corridor
  { key: "kadubeesanahalli", name: "Kadubeesanahalli / Panathur", corridor: "southeast", minutes: 40 },
  { key: "bellandur", name: "Bellandur", corridor: "southeast", minutes: 45 },
  { key: "sarjapurroad", name: "Sarjapur Road", corridor: "southeast", minutes: 50 },
  { key: "hsr", name: "HSR Layout", corridor: "southeast", minutes: 55 },
  { key: "koramangala", name: "Koramangala", corridor: "southeast", minutes: 60 },
  { key: "btm", name: "BTM Layout", corridor: "southeast", minutes: 65 },
  { key: "bommanahalli", name: "Bommanahalli", corridor: "southeast", minutes: 65 },
  { key: "jayanagar", name: "Jayanagar", corridor: "southeast", minutes: 75 },
  { key: "jpnagar", name: "JP Nagar", corridor: "southeast", minutes: 75 },
  { key: "bannerghatta", name: "Bannerghatta Road", corridor: "southeast", minutes: 80 },
  { key: "ecity", name: "Electronic City", corridor: "southeast", minutes: 80 },

  // Central-East corridor
  { key: "cvraman", name: "CV Raman Nagar", corridor: "centraleast", minutes: 40 },
  { key: "indiranagar", name: "Indiranagar", corridor: "centraleast", minutes: 50 },
  { key: "domlur", name: "Domlur", corridor: "centraleast", minutes: 50 },
  { key: "ulsoor", name: "Ulsoor / Halasuru", corridor: "centraleast", minutes: 55 },
  { key: "mgroad", name: "MG Road / Central", corridor: "centraleast", minutes: 60 },
  { key: "shivajinagar", name: "Shivajinagar", corridor: "centraleast", minutes: 60 },
  { key: "frazertown", name: "Frazer Town", corridor: "centraleast", minutes: 55 },

  // North-East corridor
  { key: "krpuram", name: "KR Puram", corridor: "northeast", minutes: 30 },
  { key: "ramamurthynagar", name: "Ramamurthy Nagar", corridor: "northeast", minutes: 35 },
  { key: "banaswadi", name: "Banaswadi", corridor: "northeast", minutes: 45 },
  { key: "kalyannagar", name: "Kalyan Nagar", corridor: "northeast", minutes: 45 },
  { key: "hbr", name: "HBR Layout", corridor: "northeast", minutes: 50 },
  { key: "hennur", name: "Hennur", corridor: "northeast", minutes: 50 },
  { key: "manyata", name: "Manyata Tech Park / Nagawara", corridor: "northeast", minutes: 55 },
  { key: "hebbal", name: "Hebbal", corridor: "northeast", minutes: 60 },
  { key: "jakkur", name: "Jakkur", corridor: "northeast", minutes: 65 },
  { key: "yelahanka", name: "Yelahanka", corridor: "northeast", minutes: 75 },

  // West & Central corridor
  { key: "basavanagudi", name: "Basavanagudi", corridor: "west", minutes: 80 },
  { key: "majestic", name: "Majestic / City Centre", corridor: "west", minutes: 80 },
  { key: "malleshwaram", name: "Malleshwaram", corridor: "west", minutes: 80 },
  { key: "banashankari", name: "Banashankari", corridor: "west", minutes: 85 },
  { key: "rajajinagar", name: "Rajajinagar", corridor: "west", minutes: 85 },
  { key: "yeshwanthpur", name: "Yeshwanthpur", corridor: "west", minutes: 85 },
  { key: "vijayanagar", name: "Vijayanagar", corridor: "west", minutes: 90 },
  { key: "nagarbhavi", name: "Nagarbhavi", corridor: "west", minutes: 95 },
  { key: "rrnagar", name: "RR Nagar", corridor: "west", minutes: 95 },
  { key: "kengeri", name: "Kengeri", corridor: "west", minutes: 100 },

  // Other
  { key: "other", name: "Other (type your area)", corridor: "other", minutes: 60 },
];

export const AREA_BY_KEY: Record<string, Area> = Object.fromEntries(
  AREAS.map((a) => [a.key, a])
);

export const CORRIDOR_BY_KEY: Record<string, Corridor> = Object.fromEntries(
  CORRIDORS.map((c) => [c.key, c])
);
