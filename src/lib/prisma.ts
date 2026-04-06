import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}

const parseNumber = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const poolMax = parseNumber(process.env.PG_POOL_MAX, 5);
const idleTimeoutMillis = parseNumber(process.env.PG_POOL_IDLE_TIMEOUT_MS, 30000);
const connectionTimeoutMillis = parseNumber(process.env.PG_POOL_CONNECTION_TIMEOUT_MS, 10000);

// Create a connection pool
const pool = new Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    keepAlive: true,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error', err);
});

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export { prisma }