// Pure geometry helpers (no Three.js) so they can be unit-tested in Node.
export const bboxOf = (ring) => ring.reduce((b, [x, y]) => ({
  minX: Math.min(b.minX, x), maxX: Math.max(b.maxX, x), minY: Math.min(b.minY, y), maxY: Math.max(b.maxY, y),
}), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

// Equirectangular projection to local metres around an origin (fine at parcel scale).
export function makeProjector(lon0, lat0) {
  const R = 6378137, k = Math.cos(lat0 * Math.PI / 180);
  return ([lon, lat]) => [ (lon - lon0) * Math.PI / 180 * R * k, (lat - lat0) * Math.PI / 180 * R ];
}

export function polygonArea(pts) { // shoelace, metres^2 if pts in metres
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}

export function pointInPolygon([x, y], pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Bilinear sample of an n x n height grid covering bbox (row 0 = minY).
export function sampleHeight(elev, lon, lat) {
  const { n, bbox, heights } = elev;
  const fx = Math.min(Math.max((lon - bbox.minX) / (bbox.maxX - bbox.minX), 0), 1) * (n - 1);
  const fy = Math.min(Math.max((lat - bbox.minY) / (bbox.maxY - bbox.minY), 0), 1) * (n - 1);
  const i = Math.min(Math.floor(fx), n - 2), j = Math.min(Math.floor(fy), n - 2), tx = fx - i, ty = fy - j;
  const h = (a, b) => heights[b * n + a] ?? 0;
  return (h(i, j) * (1 - tx) + h(i + 1, j) * tx) * (1 - ty) + (h(i, j + 1) * (1 - tx) + h(i + 1, j + 1) * tx) * ty;
}

export const snap = (v, step = 1) => Math.round(v / step) * step;
