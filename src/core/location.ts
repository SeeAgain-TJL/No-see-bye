import cities from "@/data/cities.json";

/** Rounded coordinates are used only in memory; no external geocoder or logging. */
export function nearbyLocation(latitude: number, longitude: number) {
  const rad = Math.PI / 180;
  let nearest: string | null = null, distance = Infinity;
  for (const [name, lat, lon] of cities as [string, number, number][]) {
    const a = Math.sin(((lat - latitude) * rad) / 2) ** 2 +
      Math.cos(latitude * rad) * Math.cos(lat * rad) * Math.sin(((lon - longitude) * rad) / 2) ** 2;
    const km = 12742 * Math.asin(Math.sqrt(Math.min(1, a)));
    if (km < distance) { distance = km; nearest = name; }
  }
  return nearest && distance <= 75
    ? { location: nearest + "附近", approximate: true }
    : { location: Math.abs(latitude).toFixed(2) + (latitude >= 0 ? "°N" : "°S") + " · " + Math.abs(longitude).toFixed(2) + (longitude >= 0 ? "°E" : "°W"), approximate: false };
}
