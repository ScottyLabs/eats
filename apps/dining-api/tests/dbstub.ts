import { randomUUID } from 'node:crypto';
import { DBType, initDBConnection } from 'db/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';
import { test as baseTest } from 'vitest';

function databaseUrl(name: string): string {
    const server = process.env.DATABASE_URL;
    if (server === undefined || !server.startsWith('postgresql:')) {
        throw new Error('DATABASE_URL must point at a running Postgres, so run the tests in the dev shell');
    }

    const url = new URL(server);
    url.pathname = `/${name}`;
    return url.toString();
}

async function admin(statement: string): Promise<void> {
    const client = new Client({ connectionString: databaseUrl('postgres') });
    await client.connect();
    try {
        await client.query(statement);
    } finally {
        await client.end();
    }
}

export const dbTest = baseTest.extend<{
    ctx: {
        db: DBType;
        pool: Pool;
    };
}>({
    ctx: async ({}, use) => {
        const name = `test_${randomUUID().replaceAll('-', '')}`;
        await admin(`CREATE DATABASE "${name}"`);

        const [pool, db] = initDBConnection(databaseUrl(name));
        try {
            await migrate(db, { migrationsFolder: `${__dirname}/../drizzle` });
            await use({ pool, db });
        } finally {
            await pool.end();
            await admin(`DROP DATABASE "${name}" WITH (FORCE)`);
        }
    },
});
