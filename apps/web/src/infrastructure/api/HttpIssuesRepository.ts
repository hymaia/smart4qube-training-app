import type { Issue } from '../../domain/entities/Issue';
import type { IIssuesRepository } from '../../domain/repositories/IIssuesRepository';

interface ErrorResponseBody {
  code: string;
  message: string;
  details?: string[];
}

export class HttpIssuesRepository implements IIssuesRepository {
  constructor(private readonly baseUrl: string = '') {}

  async listByProject(projectId: string): Promise<Issue[]> {
    // no-store: issues are written by other clients (scripts, reviewer agents), never serve a cached list.
    const res = await fetch(`${this.baseUrl}/issues/${encodeURIComponent(projectId)}`, { cache: 'no-store' });
    if (!res.ok) {
      let message = `Request failed with status ${res.status}`;
      try {
        const body = (await res.json()) as ErrorResponseBody;
        if (body?.message) message = body.message;
      } catch {
        // body was not JSON; keep the fallback message
      }
      throw new Error(message);
    }
    return (await res.json()) as Issue[];
  }
}

export const issuesRepository = new HttpIssuesRepository();
