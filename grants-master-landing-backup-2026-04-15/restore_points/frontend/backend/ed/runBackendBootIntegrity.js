// ED Backend Boot Integrity: always start backend from correct working directory
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

export function startBackend() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Resolve backend root cleanly
  const backendRoot = path.resolve(__dirname, '..');

  console.log('[ED] Backend root:', backendRoot);

  // Switch working directory to backend
  process.chdir(backendRoot);

  // Start backend server.js
  const child = spawn('node', ['server.js'], {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: true
  });

  return child;
}

// Usage example (ED main workflow):
// import { startBackend } from './runBackendBootIntegrity.js';
// startBackend(path.resolve(__dirname, '../../'));
