/** "Randersvej 8, 4800 Nykøbing F" → { postalCode: "4800", city: "Nykøbing F" } */
export function parseTitle(titel: string): { postalCode?: string; city?: string } {
  const m = titel.match(/,\s*(\d{4})\s+(.+)$/);
  return m ? { postalCode: m[1], city: m[2].trim() } : {};
}
