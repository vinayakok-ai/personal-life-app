import { PLANETS, SIGNS, type Graha, type Planet, type Sign } from "./types.ts";

export const SIGN_LORD: Record<Sign, Graha> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

export const NAKSHATRAS: { name: string; lord: Planet }[] = [
  ["Ashwini", "Ketu"], ["Bharani", "Venus"], ["Krittika", "Sun"], ["Rohini", "Moon"], ["Mrigashira", "Mars"],
  ["Ardra", "Rahu"], ["Punarvasu", "Jupiter"], ["Pushya", "Saturn"], ["Ashlesha", "Mercury"], ["Magha", "Ketu"],
  ["Purva Phalguni", "Venus"], ["Uttara Phalguni", "Sun"], ["Hasta", "Moon"], ["Chitra", "Mars"], ["Swati", "Rahu"],
  ["Vishakha", "Jupiter"], ["Anuradha", "Saturn"], ["Jyeshtha", "Mercury"], ["Mula", "Ketu"], ["Purva Ashadha", "Venus"],
  ["Uttara Ashadha", "Sun"], ["Shravana", "Moon"], ["Dhanishta", "Mars"], ["Shatabhisha", "Rahu"], ["Purva Bhadrapada", "Jupiter"],
  ["Uttara Bhadrapada", "Saturn"], ["Revati", "Mercury"],
].map(([name, lord]) => ({ name, lord: lord as Planet }));

/** Exaltation sign and exact degree; debilitation is the 7th sign from it. */
export const EXALTATION: Record<Planet, { sign: Sign; degree: number }> = {
  Sun: { sign: "Aries", degree: 10 }, Moon: { sign: "Taurus", degree: 3 }, Mars: { sign: "Capricorn", degree: 28 },
  Mercury: { sign: "Virgo", degree: 15 }, Jupiter: { sign: "Cancer", degree: 5 }, Venus: { sign: "Pisces", degree: 27 },
  Saturn: { sign: "Libra", degree: 20 }, Rahu: { sign: "Taurus", degree: 20 }, Ketu: { sign: "Scorpio", degree: 20 },
};

/** Moolatrikona sign and degree span. */
export const MOOLATRIKONA: Record<Graha, { sign: Sign; from: number; to: number }> = {
  Sun: { sign: "Leo", from: 0, to: 20 }, Moon: { sign: "Taurus", from: 3, to: 30 }, Mars: { sign: "Aries", from: 0, to: 12 },
  Mercury: { sign: "Virgo", from: 15, to: 20 }, Jupiter: { sign: "Sagittarius", from: 0, to: 10 },
  Venus: { sign: "Libra", from: 0, to: 15 }, Saturn: { sign: "Aquarius", from: 0, to: 20 },
};

/** Natural (naisargika) friendship, BPHS. */
export const NATURAL: Record<Graha, { friends: Graha[]; enemies: Graha[] }> = {
  Sun: { friends: ["Moon", "Mars", "Jupiter"], enemies: ["Venus", "Saturn"] },
  Moon: { friends: ["Sun", "Mercury"], enemies: [] },
  Mars: { friends: ["Sun", "Moon", "Jupiter"], enemies: ["Mercury"] },
  Mercury: { friends: ["Sun", "Venus"], enemies: ["Moon"] },
  Jupiter: { friends: ["Sun", "Moon", "Mars"], enemies: ["Mercury", "Venus"] },
  Venus: { friends: ["Mercury", "Saturn"], enemies: ["Sun", "Moon"] },
  Saturn: { friends: ["Mercury", "Venus"], enemies: ["Sun", "Moon", "Mars"] },
};

/** Parashari special full aspects (houses counted from the planet), in addition to the 7th. */
export const SPECIAL_ASPECTS: Partial<Record<Planet, number[]>> = {
  Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10],
};

/** Combustion orbs in degrees from the Sun (direct / retrograde). */
export const COMBUST_ORB: Partial<Record<Planet, { direct: number; retro: number }>> = {
  Moon: { direct: 12, retro: 12 }, Mars: { direct: 17, retro: 17 }, Mercury: { direct: 14, retro: 12 },
  Jupiter: { direct: 11, retro: 11 }, Venus: { direct: 10, retro: 8 }, Saturn: { direct: 15, retro: 15 },
};

/** Mrityu Bhaga degrees per planet per sign (Aries..Pisces), as commonly tabulated from Jataka Parijata. Verify against your text. */
export const MRITYU_BHAGA: Record<Planet, number[]> = {
  Sun: [20, 9, 12, 6, 8, 24, 16, 17, 22, 2, 3, 23],
  Moon: [8, 25, 22, 22, 21, 1, 4, 23, 18, 20, 20, 10],
  Mars: [19, 28, 25, 23, 29, 28, 14, 21, 2, 15, 11, 6],
  Mercury: [15, 14, 13, 12, 8, 18, 20, 10, 21, 22, 7, 5],
  Jupiter: [19, 29, 12, 27, 6, 4, 13, 10, 17, 11, 15, 28],
  Venus: [28, 15, 11, 17, 10, 13, 4, 6, 27, 12, 29, 19],
  Saturn: [10, 4, 11, 28, 5, 24, 13, 25, 3, 13, 6, 27],
  Rahu: [14, 13, 12, 11, 24, 23, 22, 21, 10, 20, 18, 8],
  Ketu: [8, 18, 20, 10, 21, 22, 23, 24, 11, 12, 13, 14],
};

/** Ashtakavarga kakshya lords in order, each 3°45' of a sign. */
export const KAKSHYA_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Ascendant"] as const;

export const NATURAL_BENEFICS: Planet[] = ["Jupiter", "Venus"];
export const NATURAL_MALEFICS: Planet[] = ["Sun", "Mars", "Saturn", "Rahu", "Ketu"];

export const signIndex = (s: Sign) => SIGNS.indexOf(s);
export const signAt = (i: number): Sign => SIGNS[((i % 12) + 12) % 12];
/** House number (1..12) of `sign` counted from `from`. */
export const houseFrom = (from: Sign, sign: Sign) => ((signIndex(sign) - signIndex(from) + 12) % 12) + 1;
export const isPlanet = (p: string): p is Planet => (PLANETS as readonly string[]).includes(p);
export const isGraha = (p: Planet): p is Graha => p !== "Rahu" && p !== "Ketu";
