/**
 * Logger do worker — wrapper sobre console com saída estruturada em JSON.
 * Compatível com a interface esperada em main.ts (Logger.info, Logger.warn, etc.)
 */

type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, message: string, context?: unknown): void {
  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    service: 'worker',
    msg: message,
    ...(context !== undefined ? { context } : {}),
  });

  if (level === 'error') {
    process.stderr.write(entry + '\n');
  } else {
    process.stdout.write(entry + '\n');
  }
}

export const Logger = {
  info: (message: string, context?: unknown) => log('info', message, context),
  warn: (message: string, context?: unknown) => log('warn', message, context),
  error: (message: string, context?: unknown) => log('error', message, context),
  debug: (message: string, context?: unknown) => log('debug', message, context),
};

/**
 * Alias em lowercase para compatibilidade com o padrão pino
 * usado em pncp.processor.ts: logger.info({...}, 'msg')
 */
export const logger = {
  info: (data: Record<string, unknown> | string, msg?: string) =>
    log('info', typeof data === 'string' ? data : (msg ?? ''), typeof data === 'object' ? data : undefined),
  warn: (data: Record<string, unknown> | string, msg?: string) =>
    log('warn', typeof data === 'string' ? data : (msg ?? ''), typeof data === 'object' ? data : undefined),
  error: (data: Record<string, unknown> | string, msg?: string) =>
    log('error', typeof data === 'string' ? data : (msg ?? ''), typeof data === 'object' ? data : undefined),
  debug: (data: Record<string, unknown> | string, msg?: string) =>
    log('debug', typeof data === 'string' ? data : (msg ?? ''), typeof data === 'object' ? data : undefined),
};
