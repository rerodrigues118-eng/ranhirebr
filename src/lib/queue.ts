import { Queue } from "bullmq";
import 'dotenv/config';

/**
 * Parseia uma REDIS_URL e retorna opções compatíveis com ioredis.
 */
function parseRedisUrl(url: string) {
  const u = new URL(url);
  const isTLS = url.startsWith("rediss://");
  return {
    host: u.hostname,
    port: parseInt(u.port || "6379", 10),
    password: u.password ? decodeURIComponent(u.password) : undefined,
    username: u.username && u.username !== "default" ? u.username : undefined,
    tls: isTLS ? {} : undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

let redisConnection: any = undefined;
let pdfQueue: any = undefined;

if (process.env.REDIS_URL) {
  try {
    redisConnection = parseRedisUrl(process.env.REDIS_URL);
    pdfQueue = new Queue("pdf-processing", { connection: redisConnection });
  } catch (err) {
    // Se parse falhar, mantemos stubs para evitar quebrar o build em ambientes sem REDIS_URL
    redisConnection = undefined;
    pdfQueue = {
      add: async () => { throw new Error('Redis not configured'); },
      addBulk: async () => { throw new Error('Redis not configured'); },
    } as unknown as Queue;
  }
} else {
  // Ambiente sem REDIS configurado (p.ex. build do Vercel) — expõe stubs seguros
  redisConnection = undefined;
  pdfQueue = {
    add: async () => { throw new Error('Redis not configured'); },
    addBulk: async () => { throw new Error('Redis not configured'); },
  } as unknown as Queue;
}

export { redisConnection, pdfQueue };
