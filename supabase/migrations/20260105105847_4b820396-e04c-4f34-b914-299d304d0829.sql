-- Drop existing policies that rely on auth.uid() since we use custom auth
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create permissive policies for avatars bucket (public bucket, uploads handled by app logic)
CREATE POLICY "Allow avatar uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow avatar updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars');

CREATE POLICY "Allow avatar deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars');