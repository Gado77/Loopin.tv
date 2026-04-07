-- Cria bucket para armazenar screenshots das telas
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de screenshots (qualquer usuário autenticado)
CREATE POLICY "Permitir upload de screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'screenshots');

-- Política para permitir leitura pública de screenshots
CREATE POLICY "Permitir leitura pública de screenshots"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'screenshots');

-- Política para permitir delete de screenshots (proprietário ou admin)
CREATE POLICY "Permitir delete de screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'screenshots');
