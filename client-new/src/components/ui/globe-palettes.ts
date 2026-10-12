/**
 * cobe colour presets (0–1 RGB triplets). Kept separate from globe.tsx so a section can pick a
 * palette without pulling cobe/WebGL into its chunk — the globe itself stays lazy (§31.5).
 */
type RGB = [number, number, number];

export interface GlobePalette {
  baseColor: RGB;
  markerColor: RGB;
  arcColor: RGB;
  glowColor: RGB;
  dark: number;
  mapBrightness: number;
  opacity: number;
}

// Light ground (tokens: --bg 247 247 242, --accent 255 138 0 amber-orange).
export const LIGHT_PALETTE: GlobePalette = {
  baseColor: [0.97, 0.97, 0.95], // ≈ --bg
  markerColor: [1, 0.541, 0], // --accent
  arcColor: [1, 0.541, 0],
  glowColor: [0.94, 0.93, 0.9],
  dark: 0,
  mapBrightness: 8,
  opacity: 0.9,
};

// Dark band: warm graphite land, amber-orange markers/arcs, soft warm halo.
export const DARK_PALETTE: GlobePalette = {
  baseColor: [0.27, 0.26, 0.24],
  markerColor: [1, 0.541, 0], // --accent
  arcColor: [1, 0.541, 0],
  glowColor: [0.32, 0.2, 0.06],
  dark: 1,
  mapBrightness: 4.5,
  opacity: 0.95,
};
