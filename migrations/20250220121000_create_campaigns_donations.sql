-- Create enum types if they do not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE campaign_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
        CREATE TYPE campaign_type AS ENUM ('PROJECT', 'CREATOR', 'CHARITY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_category') THEN
        CREATE TYPE campaign_category AS ENUM (
            'TECHNOLOGY',
            'CREATIVE',
            'COMMUNITY',
            'BUSINESS',
            'EDUCATION',
            'HEALTH',
            'ENVIRONMENT',
            'OTHER'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status') THEN
        CREATE TYPE donation_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    story TEXT NOT NULL,
    campaign_type campaign_type NOT NULL DEFAULT 'PROJECT',
    category campaign_category NOT NULL,
    goal_amount NUMERIC(12, 2) NOT NULL,
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status campaign_status NOT NULL DEFAULT 'DRAFT',
    cover_image TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    video_url TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns (slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns (category);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns (campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns (creator_id);

CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    message TEXT,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    status donation_status NOT NULL DEFAULT 'PENDING',
    payment_method TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations (donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations (status);
