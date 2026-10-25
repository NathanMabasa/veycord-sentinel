export const pageInfo = {
  Overview: { slug: 'overview', label: 'Overview', description: 'Security summary and recent activity' },
  Explore: { slug: 'events', label: 'Explore events', description: 'Search records and inspect event evidence' },
  Alerts: { slug: 'alerts', label: 'Alerts', description: 'Review signals that need a decision' },
  Cases: { slug: 'cases', label: 'Cases', description: 'Document investigations and export case notes' },
  Guide: { slug: 'guide', label: 'Investigation guide', description: 'Learn the alert-to-evidence workflow' },
  Detections: { slug: 'detections', label: 'Detections', description: 'Understand starter rules and why they match' },
  Sources: { slug: 'sources', label: 'Sources', description: 'Inspect the sources in this sample dataset' },
  Settings: { slug: 'settings', label: 'Settings', description: 'Change workspace, appearance and demo preferences' },
} as const;

export type Page = keyof typeof pageInfo;
export const navigationGroups: { label: string; pages: Page[] }[] = [
  { label: 'Workspace', pages: ['Overview', 'Explore'] },
  { label: 'Investigations', pages: ['Alerts', 'Cases', 'Guide'] },
  { label: 'Manage', pages: ['Detections', 'Sources', 'Settings'] },
];

export function pageFromQuery(value: string | null): Page {
  // Preserve readable aliases without allowing a caller to select arbitrary components.
  if (value === 'reports') return 'Guide';
  if (value === 'explore') return 'Explore';
  return (Object.keys(pageInfo) as Page[]).find(page => pageInfo[page].slug === value) ?? 'Overview';
}

export function demoHref(page: Page): string {
  return page === 'Overview' ? '/demo' : '/demo?view=' + pageInfo[page].slug;
}
