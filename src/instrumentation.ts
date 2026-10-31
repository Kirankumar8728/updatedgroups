export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Gracefully handle redundant server close events during Hostinger process restarts (SIGTERM/SIGINT)
    process.on('uncaughtException', (err: any) => {
      if (err?.code === 'ERR_SERVER_NOT_RUNNING' || err?.message?.includes('Server is not running')) {
        return;
      }
      console.error('[Server Uncaught Exception]:', err);
    });

    const isBuildPhase =
      process.env.NEXT_PHASE === 'phase-production-build' ||
      (Array.isArray(process.argv) && process.argv.some(arg => arg && arg.includes('build'))) ||
      process.env.npm_lifecycle_event === 'build';

    const isDev = process.env.NODE_ENV === 'development';

    if (!isBuildPhase && !isDev) {
      try {
        const { startKeepAlive } = await import('@/src/lib/keepalive');
        startKeepAlive();
      } catch (err) {
        // Ignore initialization errors during build/shutdown
      }
    }
  }
}
