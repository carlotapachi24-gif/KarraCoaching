import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function runScript(scriptName) {
  return spawn(npmCmd, ['run', scriptName], {
    stdio: 'inherit',
    // npm.cmd en Windows necesita ejecutarse via shell para evitar spawn EINVAL.
    shell: isWindows,
  });
}

const serverProcess = runScript('dev:server');
const clientProcess = runScript('dev:client');
const childProcesses = [serverProcess, clientProcess];
let isShuttingDown = false;

function shutdown(signal = 'SIGTERM') {
  if (isShuttingDown) return;
  isShuttingDown = true;
  childProcesses.forEach((child) => {
    if (child && child.exitCode === null && !child.killed) {
      child.kill(signal);
    }
  });
}

childProcesses.forEach((child) => {
  child.on('exit', (code) => {
    if (isShuttingDown) return;
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
});

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
