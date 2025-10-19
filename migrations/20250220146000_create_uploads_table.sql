-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_type VARCHAR(20) NOT NULL DEFAULT 'FILE', -- 'IMAGE', 'VIDEO', 'ATTACHMENT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_upload_type ON uploads(upload_type);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
