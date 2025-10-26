use redis::{aio::MultiplexedConnection, AsyncCommands, Client};
use std::time::Duration;
use tracing::{error, info};

#[derive(Clone)]
pub struct RedisClient {
    connection: MultiplexedConnection,
}

impl RedisClient {
    pub async fn new(redis_url: &str) -> anyhow::Result<Self> {
        info!("Connecting to Redis at {}", redis_url);

        let client = Client::open(redis_url)?;
        let connection = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| {
                error!("Failed to connect to Redis: {}", e);
                e
            })?;

        info!("Successfully connected to Redis");

        Ok(Self { connection })
    }

    /// Get a value from Redis
    pub async fn get(&mut self, key: &str) -> anyhow::Result<Option<String>> {
        match self.connection.get(key).await {
            Ok(value) => Ok(value),
            Err(e) => {
                error!("Redis GET error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Set a value in Redis with expiration
    pub async fn set_ex(&mut self, key: &str, value: &str, seconds: usize) -> anyhow::Result<()> {
        match self.connection.set_ex(key, value, seconds).await {
            Ok(()) => Ok(()),
            Err(e) => {
                error!("Redis SET_EX error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Set a value in Redis without expiration
    pub async fn set(&mut self, key: &str, value: &str) -> anyhow::Result<()> {
        match self.connection.set(key, value).await {
            Ok(()) => Ok(()),
            Err(e) => {
                error!("Redis SET error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Delete a key from Redis
    pub async fn del(&mut self, key: &str) -> anyhow::Result<()> {
        match self.connection.del::<_, ()>(key).await {
            Ok(_) => Ok(()),
            Err(e) => {
                error!("Redis DEL error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Delete multiple keys matching a pattern
    pub async fn del_pattern(&mut self, pattern: &str) -> anyhow::Result<usize> {
        let keys: Vec<String> = self.connection.keys(pattern).await?;
        if keys.is_empty() {
            return Ok(0);
        }
        let count = keys.len();
        for key in keys {
            let _: Result<(), _> = self.connection.del(&key).await;
        }
        Ok(count)
    }

    /// Increment a counter in Redis
    pub async fn incr(&mut self, key: &str) -> anyhow::Result<i64> {
        match self.connection.incr(key, 1).await {
            Ok(value) => Ok(value),
            Err(e) => {
                error!("Redis INCR error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Check if a key exists
    pub async fn exists(&mut self, key: &str) -> anyhow::Result<bool> {
        match self.connection.exists(key).await {
            Ok(exists) => Ok(exists),
            Err(e) => {
                error!("Redis EXISTS error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }

    /// Set expiration on a key
    pub async fn expire(&mut self, key: &str, seconds: usize) -> anyhow::Result<()> {
        match self.connection.expire(key, seconds).await {
            Ok(()) => Ok(()),
            Err(e) => {
                error!("Redis EXPIRE error for key '{}': {}", key, e);
                Err(e.into())
            }
        }
    }
}
