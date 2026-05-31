-- Migration 008: Add image URL to quiz questions
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS image_url TEXT;
