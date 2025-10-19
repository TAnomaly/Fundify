fn main() {
    // This build script helps with SQLx compile-time checks
    // We'll set a dummy DATABASE_URL for compilation
    if std::env::var("DATABASE_URL").is_err() {
        std::env::set_var("DATABASE_URL", "postgresql://localhost:5432/fundify");
    }
}
