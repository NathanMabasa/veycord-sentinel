/** pg connection strings can override constructor TLS, host and pool settings.
 * Accept only the URL fields we explicitly validate; never pass arbitrary query
 * parameters through to pg-connection-string. Admin tools alone set search_path.
 */
export function assertDatabaseUrlParameters(url: URL, allowAdminOptions = false): void {
  const seen = new Set<string>()
  for (const [key] of url.searchParams) {
    if (seen.has(key) || (key !== 'sslmode' && !(allowAdminOptions && key === 'options'))) {
      throw new Error('Database connection URL parameters are unsupported')
    }
    seen.add(key)
  }
  if (url.hash) throw new Error('Database connection URL fragments are unsupported')
}
