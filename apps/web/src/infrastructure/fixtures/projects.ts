import type { Project, ProjectFile } from '../../domain/entities/Project';

// Sample repositories bundled with the web app (apps/web/fixtures/repos/<projectId>/...).
const FIXTURE_RAW = import.meta.glob('/fixtures/repos/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// RocketNouilles is a standalone app at the repository root (rocketnouilles/),
// reviewed by Smart4Qube. Its sources are read straight from that folder; if the
// folder is missing or empty the glob simply yields no files.
const ROCKETNOUILLES_RAW = import.meta.glob(
  [
    '../../../../../rocketnouilles/**/*.{ts,tsx,js,jsx,mjs,cjs,css,html,md,json}',
    '!../../../../../rocketnouilles/**/node_modules/**',
    '!../../../../../rocketnouilles/**/dist/**',
    '!../../../../../rocketnouilles/**/build/**',
    '!../../../../../rocketnouilles/**/coverage/**',
    '!../../../../../rocketnouilles/**/package-lock.json',
    '!../../../../../rocketnouilles/data/**',
    '!../../../../../rocketnouilles/**/.netlify/**',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const FIXTURE_PREFIX = '/fixtures/repos/';
const ROCKETNOUILLES_PREFIX = '../../../../../rocketnouilles/';

/** Every project the viewer knows about, listed even when it has no files yet. */
const PROJECT_NAMES: Record<string, string> = {
  'acme-payments': 'Acme Payments',
  'legacy-billing': 'Legacy Billing',
  rocketnouilles: 'RocketNouilles',
};

function collectFiles(): Map<string, ProjectFile[]> {
  const byProjectId = new Map<string, ProjectFile[]>();
  const push = (projectId: string, file: ProjectFile) => {
    const files = byProjectId.get(projectId) ?? [];
    files.push(file);
    byProjectId.set(projectId, files);
  };

  for (const [key, content] of Object.entries(FIXTURE_RAW)) {
    const relative = key.slice(FIXTURE_PREFIX.length);
    const slashIndex = relative.indexOf('/');
    if (slashIndex === -1) continue;
    push(relative.slice(0, slashIndex), { path: relative.slice(slashIndex + 1), content });
  }

  for (const [key, content] of Object.entries(ROCKETNOUILLES_RAW)) {
    if (!key.startsWith(ROCKETNOUILLES_PREFIX)) continue;
    push('rocketnouilles', { path: key.slice(ROCKETNOUILLES_PREFIX.length), content });
  }

  return byProjectId;
}

function buildProjects(): Project[] {
  const byProjectId = collectFiles();
  const projectIds = new Set([...Object.keys(PROJECT_NAMES), ...byProjectId.keys()]);

  const projects: Project[] = [];
  for (const projectId of projectIds) {
    const files = byProjectId.get(projectId) ?? [];
    files.sort((a, b) => a.path.localeCompare(b.path));
    projects.push({ id: projectId, name: PROJECT_NAMES[projectId] ?? projectId, files });
  }
  projects.sort((a, b) => a.name.localeCompare(b.name));
  return projects;
}

export const PROJECTS: Project[] = buildProjects();

export function getProject(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id);
}

export function getProjectFile(projectId: string, path: string): ProjectFile | undefined {
  return getProject(projectId)?.files.find((file) => file.path === path);
}
