-- Complete sample data for all tables

-- Insert sample products
INSERT INTO products (id, user_id, name, description, price, currency, image_url, is_digital, download_url, created_at, updated_at) VALUES
(gen_random_uuid(), 'user1', 'Rust Programming Ebook', 'A comprehensive guide to Rust programming language', 29.99, 'USD', 'https://example.com/rust-ebook.jpg', TRUE, 'https://example.com/rust-ebook.pdf', NOW(), NOW()),
(gen_random_uuid(), 'user1', 'Merch T-Shirt', 'Cool T-shirt with my logo', 25.00, 'USD', 'https://example.com/tshirt.jpg', FALSE, NULL, NOW(), NOW()),
(gen_random_uuid(), 'user1', 'Digital Art Pack', 'A collection of digital art assets', 15.50, 'USD', 'https://example.com/artpack.png', TRUE, 'https://example.com/artpack.zip', NOW(), NOW()),
(gen_random_uuid(), 'user2', 'JavaScript Course', 'Complete JavaScript course for beginners', 49.99, 'USD', 'https://example.com/js-course.jpg', TRUE, 'https://example.com/js-course.zip', NOW(), NOW());

-- Create articles table if it doesn't exist
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    author_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample articles
INSERT INTO articles (id, title, content, slug, author_id, published_at, created_at, updated_at) VALUES
(gen_random_uuid(), 'Getting Started with Rust', 'This is a comprehensive guide to getting started with Rust programming language...', 'getting-started-with-rust', 'user1', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'Advanced Rust Patterns', 'Learn advanced patterns and techniques in Rust...', 'advanced-rust-patterns', 'user1', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'JavaScript Best Practices', 'Essential JavaScript best practices for modern development...', 'javascript-best-practices', 'user2', NOW(), NOW(), NOW());

-- Create podcasts table if it doesn't exist
CREATE TABLE IF NOT EXISTS podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    audio_url TEXT,
    duration INTEGER, -- in seconds
    creator_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample podcasts
INSERT INTO podcasts (id, title, description, audio_url, duration, creator_id, published_at, created_at, updated_at) VALUES
(gen_random_uuid(), 'Rust Programming Tips', 'Weekly tips and tricks for Rust developers', 'https://example.com/rust-tips-ep1.mp3', 1800, 'user1', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'Web Development Trends', 'Latest trends in web development', 'https://example.com/web-trends-ep1.mp3', 2400, 'user1', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'JavaScript Deep Dive', 'Deep dive into JavaScript concepts', 'https://example.com/js-deepdive-ep1.mp3', 2100, 'user2', NOW(), NOW(), NOW());

-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    price DOUBLE PRECISION DEFAULT 0.0,
    max_attendees INTEGER,
    host_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample events
INSERT INTO events (id, title, description, event_date, location, price, max_attendees, host_id, created_at, updated_at) VALUES
(gen_random_uuid(), 'Rust Workshop', 'Hands-on Rust programming workshop', NOW() + INTERVAL '7 days', 'Online', 0.0, 50, 'user1', NOW(), NOW()),
(gen_random_uuid(), 'Web Development Meetup', 'Monthly web development meetup', NOW() + INTERVAL '14 days', 'Tech Hub, Downtown', 15.0, 100, 'user1', NOW(), NOW()),
(gen_random_uuid(), 'JavaScript Conference', 'Annual JavaScript conference', NOW() + INTERVAL '30 days', 'Convention Center', 99.0, 500, 'user2', NOW(), NOW());
