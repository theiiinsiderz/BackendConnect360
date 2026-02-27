import prisma from '../prisma';

const DEFAULT_BATCH_SIZE = Number(process.env.DROP_EXPIRY_BATCH_SIZE || 1000);
const DEFAULT_INTERVAL_MS = Number(process.env.DROP_EXPIRY_INTERVAL_MS || 60 * 60 * 1000);

let expirySweepInProgress = false;

export const purgeExpiredDropMessages = async (batchSize: number = DEFAULT_BATCH_SIZE): Promise<number> => {
    if (expirySweepInProgress) {
        return 0;
    }

    expirySweepInProgress = true;

    try {
        let totalDeleted = 0;

        while (true) {
            const result = await prisma.$queryRaw<Array<{ deleted_count: bigint | number }>>`
                WITH deleted AS (
                    DELETE FROM "Message"
                    WHERE "id" IN (
                        SELECT "id"
                        FROM "Message"
                        WHERE "expiresAt" < NOW()
                        ORDER BY "expiresAt" ASC
                        LIMIT ${batchSize}
                    )
                    RETURNING 1
                )
                SELECT COUNT(*) AS deleted_count FROM deleted
            `;

            const rawCount = result[0]?.deleted_count ?? 0;
            const deletedCount = typeof rawCount === 'bigint' ? Number(rawCount) : Number(rawCount);
            totalDeleted += deletedCount;

            if (deletedCount < batchSize) {
                break;
            }
        }

        return totalDeleted;
    } finally {
        expirySweepInProgress = false;
    }
};

export const startDropExpiryScheduler = (): void => {
    const runSweep = async () => {
        try {
            const deleted = await purgeExpiredDropMessages();
            if (deleted > 0) {
                console.log(`[drop-expiry] deleted=${deleted}`);
            }
        } catch (error) {
            console.error('[drop-expiry] sweep failed', error);
        }
    };

    void runSweep();

    const timer = setInterval(() => {
        void runSweep();
    }, DEFAULT_INTERVAL_MS);

    timer.unref();
};
