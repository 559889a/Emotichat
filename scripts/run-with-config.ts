import { spawn } from 'child_process';
import { getServerListenOptions } from '../config/runtime';

const modeArg = process.argv[2];
const mode = modeArg === 'start' ? 'start' : 'dev';

const { host, port, listen } = getServerListenOptions();

if (!listen) {
  console.log('Listen disabled in config.yaml (server.listen = false)');
  process.exit(0);
}

const args = [mode, '-p', String(port), '-H', host];

const child = spawn('next', args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: host,
  },
});

child.on('exit', (code) => {
  process.exit(code === null ? 1 : code);
});

child.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  process.exit(1);
});
