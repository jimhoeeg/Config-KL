import { defaultConfig, type ConfigSection } from "@/lib/config/defaults";

export type FieldKind = "number" | "string" | "boolean" | "json";
export interface ConfigField {
  path: string;
  kind: FieldKind;
  value: string;
}

/** Flattens a config section into editable leaf fields. Arrays are edited as JSON. */
export function flattenSection(value: unknown, prefix = ""): ConfigField[] {
  if (Array.isArray(value) || value === null || typeof value !== "object") {
    return [{ path: prefix, kind: kindOf(value), value: kindOf(value) === "json" ? JSON.stringify(value) : String(value) }];
  }
  return Object.entries(value).flatMap(([k, v]) => flattenSection(v, prefix ? `${prefix}.${k}` : k));
}

function kindOf(v: unknown): FieldKind {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") return "string";
  return "json";
}

/**
 * Rebuilds a section from submitted form values, coercing each value to the
 * type of the corresponding default. Unknown paths are ignored.
 */
export function parseSection(section: ConfigSection, get: (path: string) => string | null): { value: unknown; errors: string[] } {
  const errors: string[] = [];
  const build = (def: unknown, path: string): unknown => {
    if (def !== null && typeof def === "object" && !Array.isArray(def)) {
      return Object.fromEntries(Object.entries(def).map(([k, v]) => [k, build(v, path ? `${path}.${k}` : k)]));
    }
    const raw = get(path);
    if (typeof def === "boolean") return raw === "on" || raw === "true";
    if (raw === null) return def;
    if (typeof def === "number") {
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n)) errors.push(`${path}: skal være et tal`);
      return Number.isFinite(n) ? n : def;
    }
    if (typeof def === "string") return raw;
    try {
      const parsed = raw.trim() === "" ? null : JSON.parse(raw);
      if (Array.isArray(def) && !Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      errors.push(`${path}: ugyldig JSON`);
      return def;
    }
  };
  return { value: build(defaultConfig[section], ""), errors };
}

export const sectionTitles: Record<ConfigSection, string> = {
  heatDemand: "Varmebehov og dimensionering",
  scop: "SCOP (effektivitet)",
  prices: "Priser",
  subsidies: "Tilskud og fradrag",
  energy: "Energipriser og CO₂",
  service: "Serviceabonnement",
  serviceArea: "Serviceområde (postnumre)",
  contact: "Kontaktoplysninger",
  trustpilot: "Trustpilot",
};
