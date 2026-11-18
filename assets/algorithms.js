export function overlaps(a, b, includeTouch = true) {
  return a.min.every((min, axis) => includeTouch
    ? min <= b.max[axis] && b.min[axis] <= a.max[axis]
    : min < b.max[axis] && b.min[axis] < a.max[axis]);
}

export function gridPath(width, height, blocked, start, goal, useHeuristic) {
  const cells = width * height;
  const distance = Array(cells).fill(Infinity);
  const previous = Array(cells).fill(-1);
  const visited = new Set();
  if (blocked.has(start) || blocked.has(goal)) return { path: [], visited };
  const heuristic = cell => useHeuristic
    ? Math.abs(cell % width - goal % width) + Math.abs(Math.floor(cell / width) - Math.floor(goal / width))
    : 0;
  const pending = new Set([start]);
  distance[start] = 0;

  while (pending.size) {
    let current = pending.values().next().value;
    for (const cell of pending) {
      if (distance[cell] + heuristic(cell) < distance[current] + heuristic(current)) current = cell;
    }
    pending.delete(current);
    visited.add(current);
    if (current === goal) {
      const path = [];
      for (let cell = goal; cell !== -1; cell = previous[cell]) path.push(cell);
      return { path: path.reverse(), visited };
    }
    const x = current % width;
    const y = Math.floor(current / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const cell = ny * width + nx;
      const candidate = distance[current] + 1;
      if (blocked.has(cell) || candidate >= distance[cell]) continue;
      distance[cell] = candidate;
      previous[cell] = current;
      pending.add(cell);
    }
  }
  return { path: [], visited };
}

export function furniturePlans(width, depth) {
  const door = { min: [1, 0], max: [2.5, 2] };
  const footprints = [[2, 1], [1.5, 1.5], [1, 0.5]];
  const choices = footprints.map(([w, h]) => {
    const positions = [];
    for (let x = 0; x + w <= width; x += 0.5) {
      for (let y = 0; y + h <= depth; y += 0.5) {
        const item = { min: [x, y], max: [x + w, y + h] };
        if (overlaps(item, door, false)) continue;
        positions.push({ ...item, score: Math.abs(x + w / 2 - width / 2) + depth - y - h });
      }
    }
    return positions.sort((a, b) => a.score - b.score);
  });
  const best = [];
  function choose(items, score) {
    if (best.length === 3 && score >= best[2].score) return;
    if (items.length === choices.length) {
      best.push({ items, score });
      best.sort((a, b) => a.score - b.score);
      if (best.length > 3) best.pop();
      return;
    }
    for (const next of choices[items.length]) {
      if (best.length === 3 && score + next.score >= best[2].score) break;
      if (!items.some(item => overlaps(item, next, false))) choose([...items, next], score + next.score);
    }
  }
  choose([], 0);
  return { door, best };
}
