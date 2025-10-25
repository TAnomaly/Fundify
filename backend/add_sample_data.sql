-- Sample data for posts
INSERT INTO posts (id, user_id, title, content, media_url, media_type, is_premium, created_at, updated_at) VALUES
(gen_random_uuid(), 'user1', 'My First Post', 'This is my first post content', 'https://example.com/image1.jpg', 'image', false, NOW(), NOW()),
(gen_random_uuid(), 'user1', 'Premium Content', 'This is premium content', 'https://example.com/video1.mp4', 'video', true, NOW(), NOW()),
(gen_random_uuid(), 'user2', 'Jane''s Post', 'This is Jane''s post', 'https://example.com/image2.jpg', 'image', false, NOW(), NOW());

-- Sample data for products
INSERT INTO products (id, user_id, name, description, price, currency, image_url, is_digital, download_url, created_at, updated_at) VALUES
(gen_random_uuid(), 'user1', 'Digital Art', 'Beautiful digital artwork', 25.99, 'USD', 'https://example.com/art1.jpg', true, 'https://example.com/download1.zip', NOW(), NOW()),
(gen_random_uuid(), 'user1', 'E-book', 'My latest e-book', 9.99, 'USD', 'https://example.com/ebook1.jpg', true, 'https://example.com/ebook1.pdf', NOW(), NOW()),
(gen_random_uuid(), 'user2', 'Photography Pack', 'Professional photos', 49.99, 'USD', 'https://example.com/photo1.jpg', true, 'https://example.com/photos.zip', NOW(), NOW());

-- Sample data for articles (if articles table exists)
INSERT INTO articles (id, author_id, title, content, excerpt, featured_image, published_at, created_at, updated_at) VALUES
(gen_random_uuid(), 'user1', 'How to Create Content', 'A comprehensive guide to content creation...', 'Learn the basics of content creation', 'https://example.com/article1.jpg', NOW(), NOW(), NOW()),
(gen_random_uuid(), 'user1', 'Digital Marketing Tips', 'Essential digital marketing strategies...', 'Boost your online presence', 'https://example.com/article2.jpg', NOW(), NOW(), NOW());

-- Sample data for podcasts (if podcasts table exists)
INSERT INTO podcasts (id, creator_id, title, description, audio_url, duration, published_at, created_at, updated_at) VALUES
(gen_random_uuid(), 'user1', 'My First Podcast', 'Welcome to my podcast series', 'https://example.com/podcast1.mp3', 1800, NOW(), NOW(), NOW()),
(gen_random_uuid(), 'user1', 'Tech Talk', 'Latest technology discussions', 'https://example.com/podcast2.mp3', 2400, NOW(), NOW(), NOW());
