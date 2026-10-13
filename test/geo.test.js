import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bboxOf, makeProjector, polygonArea, pointInPolygon, sampleHeight, snap } from '../src/geo.js';
import { SimClock } from '../src/clock.js';

test('polygon area + point in polygon', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(polygonArea(sq), 100);
  assert.ok(pointInPolygon([5, 5], sq)); assert.ok(!pointInPolygon([11, 5], sq));
});
test('projector: 0.001 deg lat ~ 111 m', () => {
  const p = makeProjector(-122.5, 37.5); assert.ok(Math.abs(p([-122.5, 37.501])[1] - 111.3) < 0.5);
});
test('bilinear height sampling', () => {
  const e = { n: 2, bbox: { minX: 0, maxX: 1, minY: 0, maxY: 1 }, heights: [0, 10, 0, 10] };
  assert.equal(sampleHeight(e, 0.5, 0.5), 5); assert.equal(snap(1.26, 0.5), 1.5);
});
test('sim clock speeds', () => {
  const c = new SimClock(Date.UTC(2026, 9, 12, 8, 0)); c.setSpeed(60); c.tick(1);
  assert.equal(c.label(), 'Day 1 09:00'); assert.throws(() => c.setSpeed(7));
  c.setSpeed(0); c.tick(100); assert.equal(c.label(), 'Day 1 09:00');
});
test('bundled parcel is real county data with elevation', () => {
  const d = JSON.parse(readFileSync(new URL('../public/data/parcel.json', import.meta.url)));
  assert.match(d.parcel.apn, /^\d{9,10}$/); assert.ok(d.parcel.ring.length > 3);
  assert.equal(d.elevation.heights.length, d.elevation.n ** 2); assert.ok(d.elevation.heights.every(h => typeof h === 'number'));
  const area = polygonArea(d.parcel.ring.map(makeProjector(d.parcel.ring[0][0], d.parcel.ring[0][1])));
  assert.ok(area > 50 && area < 1e6, `area ${area}`); assert.ok(!('COMBINEDOWNERNAMES' in d.parcel));
  assert.ok(bboxOf(d.parcel.ring).minX > -125 && bboxOf(d.parcel.ring).maxX < -116);
});
