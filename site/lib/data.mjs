// Illustrative sample inventory shared by the 3D tour and the management simulation.
import { readFileSync } from 'node:fs';

export const demoData = JSON.parse(readFileSync(new URL('../data/demo-data.json', import.meta.url)));
export const { typologies: TYPOLOGIES, status: STATUS } = demoData;

/** Round half to even, matching how the original sample tables were formatted. */
const roundHalfEven = (value, digits = 0) => {
  const factor = 10 ** digits, scaled = value * factor, floor = Math.floor(scaled), diff = scaled - floor;
  const rounded = Math.abs(diff - 0.5) < 1e-9 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(scaled);
  return rounded / factor;
};
export const fmt0 = value => String(roundHalfEven(value));
export const unitPrice = (p, u) => roundHalfEven(u.m2 * p.m2_price * (1 + (u.floor - 2) * 0.008), -2);
export const usd = n => 'USD ' + Math.round(n).toLocaleString('en-US').replaceAll(',', '.');
