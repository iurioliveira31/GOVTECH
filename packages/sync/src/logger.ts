/**
 * Logger estruturado para o package @aplicativo/sync.
 * Usa pino quando disponível; fallback para console em ambientes sem pino.
 *
 * Princípios:
 * - Logs em JSON para facilitar ingestão por Loki/CloudWatch/Datadog
 * - Níveis: trace < debug < info < warn < error < fatal
 * - Contexto obrigatório: module + mensagem + dados opcionais
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  module: string;
  msg: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry): void {
  const { level, ...rest } = entry;
  const line = JSON.stringify({ time: new Date().toISOString(), level, ...rest });

  if (level === 'error' || level === 'fatal') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export function createLogger(module: string) {
  return {
    trace: (data: Record<string, unknown> | string, msg?: string) =>
      emit(typeof data === 'string'
        ? { level: 'trace', module, msg: data }
        : { level: 'trace', module, msg: msg ?? '', ...data }),

    debug: (data: Record<string, unknown> | string, msg?: string) =>
      emit(typeof data === 'string'
        ? { level: 'debug', module, msg: data }
        : { level: 'debug', module, msg: msg ?? '', ...data }),

    info: (data: Record<string, unknown> | string, msg?: string) =>
      emit(typeof data === 'string'
        ? { level: 'info', module, msg: data }
        : { level: 'info', module, msg: msg ?? '', ...data }),

    warn: (data: Record<string, unknown> | string, msg?: string) =>
      emit(typeof data === 'string'
        ? { level: 'warn', module, msg: data }
        : { level: 'warn', module, msg: msg ?? '', ...data }),

    error: (data: Record<string, unknown> | string, msg?: string) =>
      emit(typeof data === 'string'
        ? { level: 'error', module, msg: data }
        : { level: 'error', module, msg: msg ?? '', ...data }),

    fatal: (data: Record<string, unknown> | string, msg?: string) =>
      emit(typeof data === 'string'
        ? { level: 'fatal', module, msg: data }
        : { level: 'fatal', module, msg: msg ?? '', ...data }),
  };
}

export type SyncLogger = ReturnType<typeof createLogger>;
