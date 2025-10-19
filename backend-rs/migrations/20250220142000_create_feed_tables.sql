-- Create feed_bookmarks table
CREATE TABLE IF NOT EXISTS feed_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'POST', 'ARTICLE', 'EVENT'
    content_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_type, content_id)
);

-- Create creator_posts table (if not exists)
CREATE TABLE IF NOT EXISTS creator_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    excerpt TEXT,
    images TEXT[],
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feed_bookmarks_user_id ON feed_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_bookmarks_content ON feed_bookmarks(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_creator_posts_author_id ON creator_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_creator_posts_published ON creator_posts(published);
CREATE INDEX IF NOT EXISTS idx_creator_posts_published_at ON creator_posts(published_at);
