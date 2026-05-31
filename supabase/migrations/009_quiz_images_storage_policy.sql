-- Migration 009: Storage policies for quiz-images bucket
-- Run this AFTER creating the quiz-images bucket in Supabase dashboard

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload quiz images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quiz-images');

-- Allow public read access (needed to display images to all group members)
CREATE POLICY "Public can view quiz images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'quiz-images');

-- Allow owners to delete their own images
CREATE POLICY "Users can delete their own quiz images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'quiz-images' AND (storage.foldername(name))[1] = auth.uid()::text);
