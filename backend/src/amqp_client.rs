use lapin::{
    options::*, types::FieldTable, BasicProperties, Channel, Connection, ConnectionProperties,
};
use serde::{Deserialize, Serialize};
use tracing::{error, info};

#[derive(Clone)]
pub struct AmqpClient {
    channel: Channel,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum JobMessage {
    EventReminder {
        event_id: String,
        user_id: String,
        event_title: String,
        start_time: String,
    },
    PaymentConfirmation {
        event_id: String,
        user_id: String,
        amount: f64,
    },
    TicketGenerated {
        event_id: String,
        user_id: String,
        ticket_code: String,
    },
}

impl AmqpClient {
    pub async fn new(amqp_url: &str) -> anyhow::Result<Self> {
        info!("Connecting to CloudAMQP at {}", amqp_url);

        let connection = Connection::connect(amqp_url, ConnectionProperties::default())
            .await
            .map_err(|e| {
                error!("Failed to connect to CloudAMQP: {}", e);
                e
            })?;

        let channel = connection.create_channel().await.map_err(|e| {
            error!("Failed to create AMQP channel: {}", e);
            e
        })?;

        // Declare queues
        channel
            .queue_declare(
                "event_notifications",
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        channel
            .queue_declare(
                "payment_confirmations",
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        info!("✅ CloudAMQP connected successfully");

        Ok(Self { channel })
    }

    /// Publish a job message to a queue
    pub async fn publish_job(&self, queue: &str, message: &JobMessage) -> anyhow::Result<()> {
        let payload = serde_json::to_vec(message)?;

        self.channel
            .basic_publish(
                "",
                queue,
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default().with_delivery_mode(2), // persistent
            )
            .await?
            .await?;

        info!("Published job to queue '{}': {:?}", queue, message);
        Ok(())
    }

    /// Send event reminder notification
    pub async fn send_event_reminder(
        &self,
        event_id: String,
        user_id: String,
        event_title: String,
        start_time: String,
    ) -> anyhow::Result<()> {
        let message = JobMessage::EventReminder {
            event_id,
            user_id,
            event_title,
            start_time,
        };
        self.publish_job("event_notifications", &message).await
    }

    /// Send payment confirmation
    pub async fn send_payment_confirmation(
        &self,
        event_id: String,
        user_id: String,
        amount: f64,
    ) -> anyhow::Result<()> {
        let message = JobMessage::PaymentConfirmation {
            event_id,
            user_id,
            amount,
        };
        self.publish_job("payment_confirmations", &message).await
    }

    /// Send ticket generated notification
    pub async fn send_ticket_notification(
        &self,
        event_id: String,
        user_id: String,
        ticket_code: String,
    ) -> anyhow::Result<()> {
        let message = JobMessage::TicketGenerated {
            event_id,
            user_id,
            ticket_code,
        };
        self.publish_job("event_notifications", &message).await
    }
}
