import { connect } from 'amqplib';

// Use relaxed typing to avoid build-time type mismatches across amqplib versions
let connection: any = null;
let channel: any = null;

export async function getRabbitChannel(): Promise<any | null> {
    try {
        if (channel) return channel;
        const url = process.env.RABBITMQ_URL;
        if (!url) {
            console.warn('RABBITMQ_URL not set; RabbitMQ disabled.');
            return null;
        }
        const conn = await connect(url);
        connection = conn;
    const ch = await conn.createChannel();
        channel = ch;
        return ch;
    } catch (err) {
        console.error('RabbitMQ connection error:', (err as Error).message);
        return null;
    }
}

export async function ensureQueue(queueName: string): Promise<any | null> {
    const ch = await getRabbitChannel();
    if (!ch) return null;
    await ch.assertQueue(queueName, { durable: true });
    return ch;
}

export async function publishJson(queueName: string, payload: unknown): Promise<boolean> {
    const ch = await ensureQueue(queueName);
    if (!ch) return false;
    try {
        return ch.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
            persistent: true,
            contentType: 'application/json',
        });
    } catch (err) {
        console.error('RabbitMQ publish error:', (err as Error).message);
        return false;
    }
}
