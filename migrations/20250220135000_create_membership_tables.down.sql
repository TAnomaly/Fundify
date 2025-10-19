DROP INDEX IF EXISTS idx_withdrawals_status;
DROP INDEX IF EXISTS idx_withdrawals_campaign;
DROP INDEX IF EXISTS idx_withdrawals_user;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_subscriptions_tier;
DROP INDEX IF EXISTS idx_subscriptions_creator;
DROP INDEX IF EXISTS idx_subscriptions_subscriber;
DROP INDEX IF EXISTS idx_membership_tiers_active;
DROP INDEX IF EXISTS idx_membership_tiers_campaign;
DROP TABLE IF EXISTS withdrawals;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS membership_tiers;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        DROP TYPE withdrawal_status;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        DROP TYPE subscription_status;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_interval') THEN
        DROP TYPE subscription_interval;
    END IF;
END;
$$;
