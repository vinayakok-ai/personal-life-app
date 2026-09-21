// Stars Engine v3.5 — input/output types.
// The engine never computes coordinates: every planetary value here is
// supplied by the user from an official chart (Mode 1 "INGEST DATA").

export const PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;
export type Planet = (typeof PLANETS)[number];
export const SEVEN = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
export type Graha = (typeof SEVEN)[number];

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
export type Sign = (typeof SIGNS)[number];

export type DashaLevel = "MD" | "AD" | "PD" | "SD" | "PrD";

/** A degree within a sign: decimal (12.58) or D°M'S" text ("12°34'56\"", "12:34:56", "12-34-56"). */
export type DegreeInput = number | string;

export type PlanetInput = {
  planet: Planet;
  sign: Sign;
  degree: DegreeInput;
  retrograde?: boolean;
  /** Explicit combustion flag from the chart; if omitted the engine derives it from Sun distance (flagged as derived). */
  combust?: boolean;
};

export type ChalitInput = {
  house: number; // 1..12
  cuspSign: Sign;
  cuspDegree: DegreeInput;
  /** Planets physically inside this bhava per the chart's Chalit table. If omitted for every house, occupancy is derived from the cusp (bhava-begin) degrees. */
  planets?: Planet[];
};

export type ShadbalaInput = {
  planet: Graha;
  points: number; // total shadbala (rupas or virupas — must be consistent across planets)
  ratio?: number; // strength / minimum requirement
  digBala?: number;
};

export type DashaInput = {
  level: DashaLevel;
  planet: Planet;
  start: string; // ISO date YYYY-MM-DD
  end: string;
  /** Parent chain, e.g. AD row under MD Saturn: parent: ["Saturn"]; PD row: parent: ["Saturn","Mercury"]. */
  parent?: Planet[];
};

export type VargaInput = {
  ascendant: Sign;
  planets: { planet: Planet; sign: Sign }[];
};

export type ChartInput = {
  meta: {
    name?: string;
    ayanamsa: string; // must be Lahiri (Chitra Paksha) to pass the audit gate
    source?: string;
    birth?: { date?: string; time?: string; place?: string };
  };
  panchang?: { tithi?: string; vara?: string; nakshatra?: string; yoga?: string; karana?: string };
  ascendant: { sign: Sign; degree: DegreeInput };
  planets: PlanetInput[];
  bhavaChalit?: ChalitInput[];
  /** Sarvashtakavarga points per house, index 0 = house 1. */
  sav?: number[];
  /** Alternative: SAV points per sign, index 0 = Aries (AstroSage prints it this way); mapped to houses from the ascendant. */
  savBySign?: number[];
  /** Optional Bhinnashtakavarga: for each planet, for each sign, the list of contributors that gave a bindu (needed for Step 18 Kakshya). */
  bav?: Partial<Record<Graha, Partial<Record<Sign, (Planet | "Ascendant")[]>>>>;
  shadbala?: ShadbalaInput[];
  /** Total Bhava Bala per house 1..12 (optional; v4 Promise axis). */
  bhavaBala?: number[];
  dashas: DashaInput[];
  vargas?: Partial<Record<"D9" | "D10" | "D4" | "D7", VargaInput>>;
  /** Free-form notes copied from the document that the parser could not place. */
  ledgerNotes?: string[];
};

export type TransitInput = {
  Saturn: { sign: Sign; degree: DegreeInput; retrograde?: boolean };
  Jupiter: { sign: Sign; degree: DegreeInput; retrograde?: boolean };
  Rahu?: { sign: Sign; degree: DegreeInput };
  Ketu?: { sign: Sign; degree: DegreeInput };
  asOf?: string;
};

export type QueryInput = {
  text: string;
  /** Override the keyword classifier. */
  target?: { houses?: number[]; varga?: "D9" | "D10" | "D4" | "D7" | null; timing?: boolean };
  /** Date or window the query is about (YYYY-MM-DD). Required for timing queries. */
  targetDate?: string;
  transits?: TransitInput;
  proceedWithoutVarga?: boolean;
};

// ---- Ingested (Mode 1) ----

export type PlanetRow = {
  planet: Planet;
  sign: Sign;
  degree: number; // decimal degrees within sign
  longitude: number; // absolute sidereal longitude 0..360
  nakshatra: string;
  pada: number;
  starLord: Planet;
  dignity: Dignity;
  retrograde: boolean;
  combust: boolean;
  combustDerived: boolean;
  house: number; // whole-sign house from the ascendant
  chalitHouse: number | null;
};

export type Dignity = "Exalted" | "Moolatrikona" | "Own" | "Friend" | "Neutral" | "Enemy" | "Debilitated" | "n/a";

export type LedgerEntry = { severity: "missing" | "ambiguous" | "derived" | "discarded"; note: string };

export type Ingested = {
  ayanamsa: string;
  ascendant: { sign: Sign; degree: number };
  planets: PlanetRow[];
  chalit: ChalitInput[] | null;
  sav: number[] | null;
  bav: ChartInput["bav"] | null;
  shadbala: (ShadbalaInput & { rank: number })[] | null;
  bhavaBala: number[] | null;
  dashas: DashaInput[];
  vargas: NonNullable<ChartInput["vargas"]>;
  panchang: ChartInput["panchang"] | null;
  ledger: LedgerEntry[];
};
