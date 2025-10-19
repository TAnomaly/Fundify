-- Create welcome_messages table
CREATE TABLE IF NOT EXISTS welcome_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    trigger_event VARCHAR(50) NOT NULL, -- 'SUBSCRIPTION', 'DONATION', 'FOLLOW', etc.
    is_active BOOLEAN DEFAULT TRUE,
    delay_minutes INTEGER DEFAULT 0,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_welcome_messages_creator_id ON welcome_messages(creator_id);
CREATE INDEX IF NOT EXISTS idx_welcome_messages_trigger_event ON welcome_messages(trigger_event);
CREATE INDEX IF NOT EXISTS idx_welcome_messages_is_active ON welcome_messages(is_active);
CREATE INDEX IF NOT EXISTS idx_welcome_messages_created_at ON welcome_messages(created_at);
