/**
 * Build a friendly place label from an autocomplete prediction, keeping the
 * area + city + state while dropping pincodes and the trailing country, e.g.
 *   "Sector 49" + "Badkhal, Faridabad - 121001, HR, India" → "Sector 49, Badkhal, Faridabad, HR"
 */
export function formatPlace(main: string, secondary?: string): string {
  const head = main.trim();
  if (!secondary) return head;
  const cleaned = secondary
    .replace(/\s*-\s*\d{3,}/g, "") // strip "- 121001" pincodes
    .split(",")
    .map((s) => s.trim())
    // Drop 6-digit Indian pincodes and the trailing "India", but KEEP short
    // numeric segments — those are building/plot numbers and matter for precision.
    .filter((s) => s && !/^\d{6}$/.test(s) && !/^india$/i.test(s))
    .join(", ");
  return cleaned ? `${head}, ${cleaned}` : head;
}
