import { execSync } from 'child_process';
import path from 'path';

async function globalTeardown() {
  console.log('Cleaning up E2E users from the database...');
  try {
    const backendDir = path.resolve(process.cwd(), '../backend');
    // Try python3 first, fallback to python
    try {
      execSync('python3 -m app.scripts.seed_e2e --cleanup', { cwd: backendDir, stdio: 'inherit' });
    } catch {
      execSync('python -m app.scripts.seed_e2e --cleanup', { cwd: backendDir, stdio: 'inherit' });
    }
    console.log('E2E users cleaned up successfully.');
  } catch (error) {
    console.error('Failed to clean up E2E users. Ensure python3 is available and the backend dependencies are installed.', error.message);
  }
}

export default globalTeardown;
