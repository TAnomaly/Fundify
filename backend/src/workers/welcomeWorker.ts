import { ensureQueue, getRabbitChannel } from '../utils/rabbitmq';
import prisma from '../utils/prisma';

type WelcomeJob = {
    type: 'welcome-message';
    payload: {
        subscriberId: string;
        creatorId: string;
        subject: string;
        content: string;
        welcomeMessageId: string;
    };
    delayMs: number;
    createdAt: number;
};

async function processWelcomeJob(job: WelcomeJob) {
    const { subscriberId, creatorId, subject, content, welcomeMessageId } = job.payload;
    await prisma.message.create({
        data: {
            content: `**${subject}**\n\n${content}`,
            type: 'TEXT',
            senderId: creatorId,
            receiverId: subscriberId,
        },
    });
    await prisma.welcomeMessage.update({
        where: { id: welcomeMessageId },
        data: { sentCount: { increment: 1 } },
    });
}

export async function startWelcomeWorker() {
    const ch = await ensureQueue('jobs.welcome');
    if (!ch) {
        console.warn('Welcome worker disabled (RabbitMQ not connected).');
        return;
    }

    // Prefetch 5 jobs at a time
    ch.prefetch(5);

    ch.consume('jobs.welcome', async (msg) => {
        if (!msg) return;
        try {
            const job: WelcomeJob = JSON.parse(msg.content.toString());
            const now = Date.now();
            const waitMs = Math.max(0, (job.delayMs || 0) - (now - (job.createdAt || now)));
            if (waitMs > 0) {
                setTimeout(async () => {
                    await processWelcomeJob(job);
                    ch.ack(msg);
                }, waitMs);
            } else {
                await processWelcomeJob(job);
                ch.ack(msg);
            }
        } catch (err) {
            console.error('Welcome worker error:', (err as Error).message);
            ch.nack(msg, false, false); // discard bad messages
        }
    });
}

// If started directly (node dist/workers/welcomeWorker.js)
if (require.main === module) {
    getRabbitChannel().then(() => startWelcomeWorker());
}


