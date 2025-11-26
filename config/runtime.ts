import fs from 'fs';
import path from 'path';

export interface RuntimeAuthConfig {
  enabled: boolean;
  username: string;
  password: string;
}

export interface RuntimeServerConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  listen: boolean;
  whitelist: string[];
  auth: RuntimeAuthConfig;
}

export interface RuntimePathsConfig {
  data: string;
  logs: string;
}

export interface RuntimeLoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  requestLogging: boolean;
}

export interface RuntimeConfig {
  server: RuntimeServerConfig;
  paths: RuntimePathsConfig;
  logging: RuntimeLoggingConfig;
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  server: {
    host: '127.0.0.1',
    port: 3000,
    protocol: 'http',
    listen: true,
    whitelist: ['127.0.0.1'],
    auth: {
      enabled: false,
      username: 'admin',
      password: 'change-me',
    },
  },
  paths: {
    data: './data',
    logs: './logs',
  },
  logging: {
    level: 'info',
    requestLogging: false,
  },
};

const CONFIG_PATH = path.join(process.cwd(), 'config.yaml');
let cachedConfig: RuntimeConfig | null = null;

function parsePrimitive(value: string): string | number | boolean {
  const trimmed = value.trim();
  if (!trimmed.length) {
    return '';
  }

  if (trimmed === 'true' || trimmed === 'false') {
    return trimmed === 'true';
  }

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed !== '') {
    return numeric;
  }

  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseSimpleYaml(raw: string): Record<string, any> {
  const result: Record<string, any> = {};
  let currentSection: string | null = null;
  let currentNestedKey: string | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const indent = line.match(/^\s*/)?.[0].length ?? 0;

    // handle list items under the last nested key
    if (indent >= 2 && currentSection && currentNestedKey && trimmed.startsWith('-')) {
      const section = result[currentSection] as Record<string, any>;
      const list = Array.isArray(section[currentNestedKey]) ? section[currentNestedKey] : [];
      const value = trimmed.replace(/^-+\s*/, '');
      list.push(parsePrimitive(value));
      section[currentNestedKey] = list;
      continue;
    }

    const [rawKey, ...rest] = trimmed.split(':');
    const key = rawKey.trim();
    const rawValue = rest.join(':').trim();

    if (indent === 0) {
      currentSection = key;
      currentNestedKey = null;
      if (rawValue) {
        result[key] = parsePrimitive(rawValue);
        currentSection = null;
      } else if (!result[key] || typeof result[key] !== 'object') {
        result[key] = {};
      }
      continue;
    }

    if (indent >= 2 && currentSection) {
      const section = result[currentSection] as Record<string, any>;

      if (rawValue) {
        section[key] = parsePrimitive(rawValue);
        currentNestedKey = null;
      } else {
        // prepare container for nested values or lists
        if (!section[key]) {
          section[key] = {};
        }
        // assume list by default; if later assigned object, it will be overwritten
        if (!Array.isArray(section[key])) {
          section[key] = section[key];
        }
        currentNestedKey = key;
      }
    }
  }

  return result;
}

function tryParseConfig(raw: string): Record<string, any> {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore
  }

  try {
    // Optional dependency, fall back if unavailable
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const yaml = require('yaml');
    return yaml.parse(trimmed);
  } catch {
    // ignore
  }

  return parseSimpleYaml(trimmed);
}

function mergeRuntimeConfig(
  base: RuntimeConfig,
  overrides: Partial<RuntimeConfig>
): RuntimeConfig {
  return {
    server: {
      ...base.server,
      ...(overrides.server || {}),
      auth: {
        ...base.server.auth,
        ...(overrides.server?.auth || {}),
      },
      whitelist: overrides.server?.whitelist || base.server.whitelist,
    },
    paths: {
      ...base.paths,
      ...(overrides.paths || {}),
    },
    logging: {
      ...base.logging,
      ...(overrides.logging || {}),
    },
  };
}

function resolvePath(targetPath: string): string {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.join(process.cwd(), targetPath);
}

export function loadRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  let parsedConfig: Partial<RuntimeConfig> = {};

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    parsedConfig = tryParseConfig(raw) as Partial<RuntimeConfig>;
  } catch {
    parsedConfig = {};
  }

  cachedConfig = mergeRuntimeConfig(DEFAULT_RUNTIME_CONFIG, parsedConfig);
  return cachedConfig;
}

export function getRuntimePaths(): { dataDir: string; logsDir: string } {
  const config = loadRuntimeConfig();
  return {
    dataDir: resolvePath(config.paths.data),
    logsDir: resolvePath(config.paths.logs),
  };
}

export function getServerListenOptions(): {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  listen: boolean;
} {
  const config = loadRuntimeConfig();
  return {
    host: config.server.host,
    port: config.server.port,
    protocol: config.server.protocol,
    listen: config.server.listen,
  };
}

export function getAccessControlConfig(): {
  whitelist: string[];
  auth: RuntimeAuthConfig;
} {
  const config = loadRuntimeConfig();
  return {
    whitelist: config.server.whitelist,
    auth: config.server.auth,
  };
}

export function isIpAllowed(ip: string): boolean {
  const { whitelist } = getAccessControlConfig();
  const segments = ip.split('.');

  return whitelist.some((pattern) => {
    const parts = pattern.split('.');
    if (parts.length !== 4 || segments.length !== 4) return false;

    for (let i = 0; i < 4; i++) {
      const part = parts[i];
      if (part === '*') continue;
      if (part !== segments[i]) return false;
    }
    return true;
  });
}
