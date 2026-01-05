-- Permitir inserção de novos usuários
CREATE POLICY "Users can be created" 
ON public.users 
FOR INSERT 
WITH CHECK (true);