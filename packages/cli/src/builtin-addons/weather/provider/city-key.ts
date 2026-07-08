import type { GeocodedLocation } from "./geocode";

const roundCoord = (n: number, decimals = 2): number => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};

export const cityKey = (loc: GeocodedLocation): string =>
  `${roundCoord(loc.latitude)},${roundCoord(loc.longitude)}`;
