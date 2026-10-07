import { describe, it, expect } from 'vitest';
import { PROJECTS, getProject, getProjectFile } from './projects';

describe('projects', () => {
  it('lists every known project, sorted by name', () => {
    expect(PROJECTS.map((p) => p.id)).toEqual(['acme-payments', 'legacy-billing', 'rocketnouilles']);
    expect(getProject('rocketnouilles')?.name).toBe('RocketNouilles');
  });

  it('loads fixture files with repo-relative paths', () => {
    const file = getProjectFile('acme-payments', 'src/auth/login.ts');
    expect(file?.content).toContain('ADMIN_TOKEN');
  });

  it('exposes RocketNouilles files relative to rocketnouilles/, without build or dependency output', () => {
    // The folder may be empty while the app is being built; files are optional.
    const files = getProject('rocketnouilles')?.files ?? [];
    for (const file of files) {
      expect(file.path).not.toMatch(/^(\.\.|\/)/);
      expect(file.path).not.toMatch(/(^|\/)(node_modules|dist)\//);
    }
  });
});
