use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: Option<PgPool>,
}

impl AppState {
    pub fn new(db: PgPool) -> Self {
        Self { db: Some(db) }
    }
    
    pub fn new_dummy() -> Self {
        Self { db: None }
    }
}
