-- Allow updating raffle entries
CREATE POLICY "Entries can be updated"
ON public.raffle_entries
FOR UPDATE
USING (true)
WITH CHECK (true);