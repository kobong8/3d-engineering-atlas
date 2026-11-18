import test from "node:test";
import assert from "node:assert/strict";
import { furniturePlans, gridPath, overlaps } from "../assets/algorithms.js";

test("AABB handles touching, containment and separation", () => {
  const a = { min: [0, 0], max: [2, 2] };
  const edge = { min: [2, 0], max: [4, 1] };
  assert.equal(overlaps(a, edge), true);
  assert.equal(overlaps(a, edge, false), false);
  assert.equal(overlaps(a, { min: [0.5, 0.5], max: [1, 1] }, false), true);
  assert.equal(overlaps(a, { min: [1, 3], max: [2, 4] }), false);
});

test("grid algorithms agree on cost through an open door and report a closure", () => {
  const wall = new Set([2, 12, 17, 22]);
  const start = 5;
  const goal = 19;
  const astar = gridPath(5, 5, wall, start, goal, true);
  const dijkstra = gridPath(5, 5, wall, start, goal, false);
  assert.equal(astar.path.length, 7);
  assert.equal(astar.path.length, dijkstra.path.length);
  assert.ok(astar.visited.size <= dijkstra.visited.size);
  assert.ok(astar.path.every(cell => !wall.has(cell)));
  wall.add(7);
  assert.deepEqual(gridPath(5, 5, wall, start, goal, true).path, []);
});

test("best furniture plans are ranked, reproducible and clear of the door", () => {
  for (const width of [4, 8, 10]) {
    const { door, best } = furniturePlans(width, 5);
    assert.equal(best.length, 3);
    assert.deepEqual(furniturePlans(width, 5).best, best);
    assert.ok(best[0].score <= best[1].score && best[1].score <= best[2].score);
    for (const { items } of best) {
      items.forEach((item, index) => {
        assert.ok(item.min.every(n => n >= 0));
        assert.ok(item.max[0] <= width && item.max[1] <= 5);
        assert.ok(!overlaps(item, door, false));
        assert.ok(!items.slice(index + 1).some(other => overlaps(item, other, false)));
      });
    }
  }
  assert.deepEqual(furniturePlans(1, 1).best, []);
});
