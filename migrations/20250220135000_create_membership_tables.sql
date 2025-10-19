DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_interval') THEN
        CREATE TYPE subscription_interval AS ENUM ('MONTHLY', 'YEARLY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS membership_tiers (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    interval subscription_interval NOT NULL DEFAULT 'MONTHLY',
    perks TEXT[] NOT NULL DEFAULT '{}',
    has_exclusive_content BOOLEAN NOT NULL DEFAULT FALSE,
    has_early_access BOOLEAN NOT NULL DEFAULT FALSE,
    has_priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    custom_perks JSONB,
    max_subscribers INTEGER,
    current_subscribers INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY,
    subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES membership_tiers(id) ON DELETE CASCADE,
    status subscription_status NOT NULL DEFAULT 'ACTIVE',
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_billing_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL,
    status withdrawal_status NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    bank_account TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_tiers_campaign ON membership_tiers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_membership_tiers_active ON membership_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_campaign ON withdrawals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
