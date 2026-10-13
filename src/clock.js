// Sim clock: 1x = 1 game minute per real second. Speeds in game-minutes per second.
export const SPEEDS = [0, 1, 10, 60, 600, 1440, 10080]; // 1440 = 1 day per second, 10080 = 1 week per second
export class SimClock {
  constructor(start = Date.UTC(2026, 9, 12, 15, 0)) { this.t = start; this.speed = 1; }
  setSpeed(s) { if (!SPEEDS.includes(s)) throw new Error(`bad speed ${s}`); this.speed = s; }
  tick(realSeconds) { this.t += realSeconds * this.speed * 60_000; return this.t; }
  get day() { return Math.floor((this.t - Date.UTC(2026, 9, 12)) / 86_400_000) + 1; }
  label() { const d = new Date(this.t); return `Day ${this.day} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
}
