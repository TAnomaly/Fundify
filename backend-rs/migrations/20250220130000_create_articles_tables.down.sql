DROP INDEX IF EXISTS idx_article_likes_user;
DROP INDEX IF EXISTS idx_article_comments_user;
DROP INDEX IF EXISTS idx_article_comments_article;
DROP INDEX IF EXISTS idx_articles_is_premium;
DROP INDEX IF EXISTS idx_articles_published_at;
DROP INDEX IF EXISTS idx_articles_status;
DROP INDEX IF EXISTS idx_articles_author;

DROP TABLE IF EXISTS article_likes;
DROP TABLE IF EXISTS article_comments;
DROP TABLE IF EXISTS article_tags;
DROP TABLE IF EXISTS article_categories;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS categories;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
        DROP TYPE article_status;
    END IF;
END;
$$;
