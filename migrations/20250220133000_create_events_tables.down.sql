DROP INDEX IF EXISTS idx_event_reminders_user;
DROP INDEX IF EXISTS idx_event_reminders_event;
DROP INDEX IF EXISTS idx_event_rsvps_status;
DROP INDEX IF EXISTS idx_event_rsvps_user;
DROP INDEX IF EXISTS idx_event_rsvps_event;
DROP INDEX IF EXISTS idx_events_public;
DROP INDEX IF EXISTS idx_events_start_time;
DROP INDEX IF EXISTS idx_events_type;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_host;
DROP TABLE IF EXISTS event_reminders;
DROP TABLE IF EXISTS event_rsvps;
DROP TABLE IF EXISTS events;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_status') THEN
        DROP TYPE rsvp_status;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        DROP TYPE event_status;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        DROP TYPE event_type;
    END IF;
END;
$$;
