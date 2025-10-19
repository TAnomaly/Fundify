DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
        CREATE TYPE product_type AS ENUM ('EBOOK', 'COURSE', 'TEMPLATE', 'AUDIO', 'VIDEO', 'SOFTWARE', 'ASSET', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
        CREATE TYPE purchase_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS digital_products (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    product_type product_type NOT NULL,
    price_cents INTEGER NOT NULL,
    file_url TEXT,
    file_size BIGINT,
    cover_image TEXT,
    preview_url TEXT,
    features TEXT[] NOT NULL DEFAULT '{}',
    requirements TEXT[] NOT NULL DEFAULT '{}',
    sales_count INTEGER NOT NULL DEFAULT 0,
    revenue_cents BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    status purchase_status NOT NULL DEFAULT 'PENDING',
    payment_method TEXT,
    transaction_id TEXT UNIQUE,
    download_count INTEGER NOT NULL DEFAULT 0,
    last_download_at TIMESTAMPTZ,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_digital_products_creator ON digital_products(creator_id);
CREATE INDEX IF NOT EXISTS idx_digital_products_type ON digital_products(product_type);
CREATE INDEX IF NOT EXISTS idx_digital_products_active ON digital_products(is_active);
CREATE INDEX IF NOT EXISTS idx_digital_products_featured ON digital_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
