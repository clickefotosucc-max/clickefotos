-- ============================================
-- CLICKEFOTOS - Script SQL para Supabase
-- ============================================
-- Execute este script no Supabase SQL Editor
-- https://supabase.com/dashboard → SQL Editor
-- ============================================

-- 1. Criar tabela de fotos
CREATE TABLE fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url TEXT NOT NULL,
  autor TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  likes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de categorias
CREATE TABLE categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- 3. Inserir categorias padrão
INSERT INTO categorias (nome, slug) VALUES
  ('Geral', 'geral'),
  ('Produtos', 'produtos'),
  ('Estandes', 'estandes'),
  ('Equipe', 'equipe'),
  ('Apresentações', 'apresentacoes');

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- 5. Permitir leitura pública
CREATE POLICY "Allow public read" ON fotos FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON categorias FOR SELECT USING (true);

-- 6. Permitir inserção pública
CREATE POLICY "Allow public insert" ON fotos FOR INSERT WITH CHECK (true);

-- 7. Permitir atualização pública (para likes)
CREATE POLICY "Allow public update" ON fotos FOR UPDATE USING (true);

-- 8. Criar bucket de storage para fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true);

-- 9. Permitir upload público no storage
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'fotos');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'fotos');
