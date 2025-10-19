-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0.0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    cover_image TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT TRUE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_creator_id ON goals(creator_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_is_public ON goals(is_public);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at);
