const { Queue } = require('bullmq');
const url = new URL(process.env.REDIS_URL || 'redis://redis:6379');
const queue = new Queue('ses-resolutions-sync', { connection: { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined } });
queue.add('sync:resolutions', {}, { jobId: 'manual-run-' + Date.now() }).then(() => { console.log('Enfileirado!'); process.exit(0); });
