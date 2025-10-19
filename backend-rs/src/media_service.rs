use crate::config::AppConfig;
use anyhow::Result;
use supabase_rs::SupabaseClient;

#[derive(Clone)]
pub struct MediaService {
    client: SupabaseClient,
}

impl MediaService {
    pub fn new(config: &AppConfig) -> Result<Self> {
        let client = SupabaseClient::new(
            config.supabase_url.as_ref().unwrap().clone(),
            config.supabase_anon_key.as_ref().unwrap().clone(),
        )?;
        Ok(Self { client })
    }

    pub async fn upload(&self, file: Vec<u8>, path: &str, content_type: &str) -> Result<String> {
        let response = self
            .client
            .storage()
            .from("fundify-media")
            .upload_with_options(path, &file, content_type)
            .await?;
        Ok(response)
    }
}