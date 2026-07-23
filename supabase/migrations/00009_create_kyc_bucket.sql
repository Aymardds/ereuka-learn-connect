-- 1. Créer le bucket "kyc-documents" s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Autoriser n'importe qui à uploader des documents (pour le formulaire public)
CREATE POLICY "Public Upload Access" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc-documents');

-- 3. Autoriser tout le monde à lire les documents (car le bucket est public)
CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents');
