import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`

// Create a connection pool
const pool = new Pool({
    connectionString,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

export { prisma }