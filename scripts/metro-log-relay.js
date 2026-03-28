const http = require('http');

const port = 8090;
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, ...styles) {
  return `${styles.join('')}${text}${ANSI.reset}`;
}

function colorForChannel(channel) {
  switch (channel) {
    case 'client/windows/members':
      return [ANSI.bold, ANSI.cyan];
    case 'client/android/members':
      return [ANSI.bold, ANSI.green];
    case 'client/windows/accounts':
      return [ANSI.bold, ANSI.blue];
    case 'client/android/accounts':
      return [ANSI.bold, ANSI.yellow];
    case 'WindowsDesktopShell':
      return [ANSI.bold, ANSI.cyan];
    case 'AccountSection':
      return [ANSI.bold, ANSI.blue];
    case 'LoginTestSection':
      return [ANSI.bold, ANSI.magenta];
    case 'accountApi':
      return [ANSI.green];
    case 'DevHealthSection':
      return [ANSI.yellow];
    default:
      return [ANSI.dim];
  }
}

function colorForPlatform(platform) {
  switch (platform) {
    case 'windows':
      return [ANSI.bold, ANSI.yellow];
    case 'android':
      return [ANSI.bold, ANSI.green];
    case 'ios':
      return [ANSI.bold, ANSI.blue];
    default:
      return [ANSI.dim];
  }
}

function formatPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return '[unserializable-payload]';
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/logs') {
    res.statusCode = 404;
    res.end('not found');
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const entry = JSON.parse(body);
      const channel = entry.channel || 'client';
      const event = entry.event || 'unknown';
      const platform = entry.platform || 'unknown';
      const payload = formatPayload(entry.payload);
      const prefix =
        `${colorize('[metro-log]', ANSI.bold, ANSI.magenta)}` +
        `${colorize(`[${platform}]`, ...colorForPlatform(platform))}` +
        `${colorize(`[${channel}]`, ...colorForChannel(channel))}`;
      console.log(
        `${prefix} ${event}${
          payload ? ` ${colorize(payload, ANSI.dim)}` : ''
        }`,
      );
      res.statusCode = 200;
      res.end('ok');
    } catch (error) {
      console.error(
        colorize(`[metro-log] invalid payload: ${error.message}`, ANSI.red, ANSI.bold),
      );
      res.statusCode = 400;
      res.end('invalid payload');
    }
  });
});

server.on('listening', () => {
  console.log(
    colorize(
      `[metro-log] relay listening on http://127.0.0.1:${port}/logs`,
      ANSI.bold,
      ANSI.magenta,
    ),
  );
});

server.on('error', error => {
  console.error(
    colorize(`[metro-log] relay failed: ${error.message}`, ANSI.red, ANSI.bold),
  );
  process.exit(1);
});

server.listen(port, '127.0.0.1');
