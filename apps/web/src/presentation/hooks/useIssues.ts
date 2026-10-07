import useSWR from 'swr';
import type { Issue } from '../../domain/entities/Issue';
import { issuesRepository } from '../../infrastructure/api/HttpIssuesRepository';

// Issues are created/updated/deleted by other clients (CLI scripts, reviewer
// agents), so the viewer polls and revalidates instead of trusting its cache.
const REFRESH_INTERVAL_MS = 5000;

export function useIssues(projectId: string): { issues: Issue[]; isLoading: boolean; error: Error | undefined } {
  const { data, isLoading, error } = useSWR<Issue[]>(
    ['issues', projectId],
    () => issuesRepository.listByProject(projectId),
    { refreshInterval: REFRESH_INTERVAL_MS, revalidateOnFocus: true, revalidateOnMount: true },
  );
  return { issues: data ?? [], isLoading, error };
}
