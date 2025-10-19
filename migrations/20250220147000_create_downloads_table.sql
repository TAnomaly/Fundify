-- Create downloads table
CREATE TABLE IF NOT EXISTS downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    requires_subscription BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create download_records table for tracking downloads
CREATE TABLE IF NOT EXISTS download_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    download_id UUID NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, download_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_downloads_creator_id ON downloads(creator_id);
CREATE INDEX IF NOT EXISTS idx_downloads_is_public ON downloads(is_public);
CREATE INDEX IF NOT EXISTS idx_downloads_file_type ON downloads(file_type);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at);
CREATE INDEX IF NOT EXISTS idx_download_records_user_id ON download_records(user_id);
CREATE INDEX IF NOT EXISTS idx_download_records_download_id ON download_records(download_id);
