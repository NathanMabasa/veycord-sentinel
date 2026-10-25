import test from 'node:test';
import assert from 'node:assert/strict';
import { demoHref, navigationGroups, pageFromQuery, pageInfo, type Page } from '../src/features/demo/navigation.ts';

test('every implemented page has one navigation group and a safe round-trip URL', () => {
  const pages = Object.keys(pageInfo) as Page[];
  const grouped = navigationGroups.flatMap(group => group.pages);
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), [...pages].sort());
  for (const page of pages) {
    const url = new URL(demoHref(page), 'https://sentinel.example');
    assert.equal(url.origin, 'https://sentinel.example');
    assert.equal(url.pathname, '/demo');
    assert.equal(pageFromQuery(url.searchParams.get('view')), page);
    assert.ok(pageInfo[page].description.length > 10);
  }
});
test('unknown view input fails to overview; legacy guide and event aliases remain readable', () => {
  for (const value of [null, '', 'constructor', '__proto__', 'https://example.test', '<script>alert(1)</script>', 'a'.repeat(10000)]) {
    assert.equal(pageFromQuery(value), 'Overview');
  }
  assert.equal(pageFromQuery('reports'), 'Guide');
  assert.equal(pageFromQuery('explore'), 'Explore');
  assert.equal(pageInfo.Guide.label, 'Investigation guide');
});
