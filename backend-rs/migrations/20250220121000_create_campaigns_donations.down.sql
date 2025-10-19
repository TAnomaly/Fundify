DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS campaigns;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status') THEN
        DROP TYPE donation_status;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_category') THEN
        DROP TYPE campaign_category;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_type') THEN
        DROP TYPE campaign_type;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        DROP TYPE campaign_status;
    END IF;
END;
$$;
