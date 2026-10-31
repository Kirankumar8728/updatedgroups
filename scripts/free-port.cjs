const { execSync } = require('child_process');

try {
  // Free port 3000 if occupied by another process before starting Next.js dev server
  try {
    execSync('fuser -k -9 3000/tcp 2>/dev/null || true');
  } catch {}
  try {
    execSync('lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true');
  } catch {}
} catch {}
