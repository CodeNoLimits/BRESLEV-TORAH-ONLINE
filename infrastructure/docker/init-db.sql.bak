-- Initialize Breslev Torah Online Database
-- This script creates initial schema and indexes

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For accent-insensitive search

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'scholar', 'student', 'guest');
CREATE TYPE book_category AS ENUM ('Chasidut', 'Kabbalah', 'Liturgy', 'Biography', 'Stories');
CREATE TYPE text_type AS ENUM ('main', 'commentary', 'translation', 'notes');
CREATE TYPE study_status AS ENUM ('not_started', 'in_progress', 'completed', 'reviewed');
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');

-- Create search configuration for Hebrew text
CREATE TEXT SEARCH CONFIGURATION hebrew (COPY = simple);

-- Function to generate search vector
CREATE OR REPLACE FUNCTION generate_search_vector(
    text_he TEXT,
    text_en TEXT,
    text_fr TEXT
) RETURNS tsvector AS $$
BEGIN
    RETURN 
        setweight(to_tsvector('simple', COALESCE(text_he, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(text_en, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(text_fr, '')), 'C');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_is_active ON books(is_active);
CREATE INDEX IF NOT EXISTS idx_books_order ON books(order_index);

CREATE INDEX IF NOT EXISTS idx_texts_book_id ON texts(book_id);
CREATE INDEX IF NOT EXISTS idx_texts_ref ON texts(ref);
CREATE INDEX IF NOT EXISTS idx_texts_book_chapter ON texts(book_id, chapter);
CREATE INDEX IF NOT EXISTS idx_texts_search ON texts USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_study_progress_user_book ON study_progress(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_status ON study_progress(status);

-- Triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_texts_updated_at BEFORE UPDATE ON texts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update search vector on text insert/update
CREATE OR REPLACE FUNCTION update_text_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := generate_search_vector(NEW.text_he, NEW.text_en, NEW.text_fr);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_text_search_vector_trigger
BEFORE INSERT OR UPDATE ON texts
FOR EACH ROW EXECUTE FUNCTION update_text_search_vector();

-- Create materialized view for book statistics
CREATE MATERIALIZED VIEW book_statistics AS
SELECT 
    b.id as book_id,
    b.slug,
    COUNT(DISTINCT t.id) as total_texts,
    COUNT(DISTINCT t.chapter) as total_chapters,
    COUNT(DISTINCT bm.id) as bookmark_count,
    COUNT(DISTINCT sp.id) as study_count,
    AVG(sp.progress_percentage) as avg_progress
FROM books b
LEFT JOIN texts t ON b.id = t.book_id
LEFT JOIN bookmarks bm ON b.id = bm.book_id
LEFT JOIN study_progress sp ON b.id = sp.book_id
GROUP BY b.id, b.slug;

CREATE INDEX ON book_statistics(book_id);

-- Function to refresh book statistics
CREATE OR REPLACE FUNCTION refresh_book_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY book_statistics;
END;
$$ LANGUAGE plpgsql;

-- Initial data: Admin user (password: admin123)
INSERT INTO users (email, name, role, hashed_password, is_active, is_verified)
VALUES (
    'admin@breslev-torah.com',
    'Admin',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGH8btF6fFO',
    true,
    true
) ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;