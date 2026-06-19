import { describe, it, expect } from 'vitest';
import { getCatalog, getModule, validateCurriculum } from './loader';

describe('curriculum loader', () => {
  it('validates and exposes a catalog of at least 8 modules', () => {
    expect(() => validateCurriculum()).not.toThrow();
    expect(getCatalog().length).toBeGreaterThanOrEqual(8);
  });
  it('every module has at least one weakness tag and a stable id', () => {
    for (const m of getCatalog()) {
      expect(m.weaknessTags.length).toBeGreaterThan(0);
      expect(m.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
  it('getModule returns full content for a known id', () => {
    const first = getCatalog()[0];
    expect(first).toBeDefined();
    expect(getModule(first!.id)?.content.length).toBeGreaterThan(0);
  });
});
