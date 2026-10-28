const configuredRepository = import.meta.env.VITE_GITHUB_REPOSITORY ?? 'NathanMabasa/veycord-sentinel'

const validRepository = configuredRepository && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuredRepository) ? configuredRepository : undefined

export const appConfig = {
  hasRepository: Boolean(validRepository),
  name: 'Veycord Sentinel',
  publicDemo: import.meta.env.VITE_PUBLIC_DEMO === 'true',
  // Override for forks; the default public repository was verified at publication.
  githubUrl: validRepository ? `https://github.com/${validRepository}` : '',
  sourceZipUrl: validRepository ? `https://github.com/${validRepository}/archive/refs/heads/main.zip` : '',
}
