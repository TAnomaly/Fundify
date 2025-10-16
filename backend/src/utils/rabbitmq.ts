import amqp from 'amqplib';

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function getRabbitChannel(): Promise<amqp.Channel | null> {
  try {
    if (channel) return channel;
    const url = process.env.RABBITMQ_URL;
    if (!url) {
      console.warn('RABBITMQ_URL not set; RabbitMQ disabled.');
      return null;
    }
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    return channel;
  } catch (err) {
    console.error('RabbitMQ connection error:', (err as Error).message);
    return null;
  }
}

export async function ensureQueue(queueName: string): Promise<amqp.Channel | null> {
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
