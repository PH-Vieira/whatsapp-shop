-- Add group notification field to raffles
ALTER TABLE public.raffles 
ADD COLUMN notification_group TEXT;