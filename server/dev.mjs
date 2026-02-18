import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function runScript(scriptName) {
  const child = spawn(npmCmd, ['run', scriptName], {
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

const serverProcess = runScript('dev:server');
const clientProcess = runScript('dev:client');

function shutdown() {
  serverProcess.kill('SIGTERM');
  clientProcess.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
