import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationUrl = new URL(
  '../supabase/migrations/20260814120000_lock_profile_role_updates.sql',
  import.meta.url,
)
const migration = readFileSync(migrationUrl, 'utf8')

describe('profile role security migration', () => {
  it('removes the table-wide update privilege from authenticated users', () => {
    expect(migration).toMatch(/revoke update on table public\.profiles from authenticated/i)
  })

  it('does not grant authenticated users permission to update role', () => {
    const allowedColumns = migration.match(/grant update \(([\s\S]*?)\) on table public\.profiles/i)?.[1]

    expect(allowedColumns).toBeDefined()
    expect(allowedColumns).not.toMatch(/\brole\b/i)
  })

  it('keeps a trigger guard against future broad grants', () => {
    expect(migration).toMatch(/before update of role on public\.profiles/i)
    expect(migration).toMatch(/raise exception 'profile role can only be changed/i)
  })
})
