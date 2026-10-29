import type { Pool } from 'pg'

export const WORKSPACE_LIMITS = { read: 60, ingest: 10, 'case-write': 10 } as const
export type WorkspaceBudgetKind = keyof typeof WORKSPACE_LIMITS
export type BudgetDecision = { allowed: boolean; retryAfterSeconds: number }
export type BudgetConsumer = (kind: WorkspaceBudgetKind) => Promise<BudgetDecision>

/** Called only with server-verified identity and the configured workspace. */
export async function consumeWorkspaceBudget(pool: Pool, workspaceId: string, userId: string, kind: WorkspaceBudgetKind): Promise<BudgetDecision> {
  if (!Object.hasOwn(WORKSPACE_LIMITS, kind) || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) throw new Error('Invalid budget scope')
  const limit = WORKSPACE_LIMITS[kind]
  const result = await pool.query<{ attempts: number; retry_after: number }>(`
    INSERT INTO sentinel_identity.workspace_budget AS budget (workspace_id, user_id, kind, window_start, attempts)
    SELECT workspace_id, user_id, $3, date_trunc('minute', statement_timestamp()), 1
    FROM sentinel_identity.memberships WHERE workspace_id = $1 AND user_id = $2 AND active = true
    ON CONFLICT (workspace_id, user_id, kind) DO UPDATE SET
      attempts = CASE WHEN budget.window_start < EXCLUDED.window_start THEN 1 ELSE LEAST(budget.attempts + 1, $4::integer + 1) END,
      window_start = GREATEST(budget.window_start, EXCLUDED.window_start)
    RETURNING attempts, GREATEST(1, LEAST(60, CEIL(EXTRACT(EPOCH FROM window_start + interval '1 minute' - clock_timestamp()))))::integer AS retry_after
  `, [workspaceId, userId, kind, limit])
  const row = result.rows[0]
  // Missing/revoked membership or a database failure must never disable limiting.
  if (!row) throw new Error('Workspace budget scope unavailable')
  return { allowed: row.attempts <= limit, retryAfterSeconds: row.retry_after }
}
