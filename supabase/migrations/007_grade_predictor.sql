-- Migration 007: Add score tracking to deadlines for Grade Predictor
ALTER TABLE deadlines
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;
