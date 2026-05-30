-- Migration 003: store extracted PDF text for AI chat
ALTER TABLE public.syllabi
  ADD COLUMN IF NOT EXISTS extracted_text TEXT;
