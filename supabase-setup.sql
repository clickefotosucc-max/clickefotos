-- ============================================
-- CLICKEFOTOS - Script SQL ATUALIZADO
-- ============================================
-- Execute no Supabase SQL Editor (após deletar tabelas antigas)
-- ============================================

-- DROP das tabelas antigas (cuidado: apaga dados existentes)
DROP TABLE IF EXISTS fotos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;

-- ============================================
-- 1. Tabela de estandes (empresas dos alunos)
-- ============================================
CREATE TABLE estandes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  responsavel TEXT NOT NULL,
  turma TEXT,
  preco_por_foto DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Tabela de fotos
-- ============================================
CREATE TABLE fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estande_id UUID REFERENCES estandes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url TEXT NOT NULL,
  url_hd TEXT NOT NULL,
  vendida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Tabela de compras (controle de downloads)
-- ============================================
CREATE TABLE compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  foto_id UUID REFERENCES fotos(id) ON DELETE CASCADE,
  cliente_email TEXT,
  cliente_nome TEXT,
  valor_pago DECIMAL(10,2),
  status TEXT DEFAULT 'pendente', -- pendente, pago, cancelado
  download_token TEXT UNIQUE,
  downloads_realizados INT DEFAULT 0,
  max_downloads INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================
ALTER TABLE estandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública de estandes e fotos
CREATE POLICY "Allow public read estandes" ON estandes FOR SELECT USING (true);
CREATE POLICY "Allow public read fotos" ON fotos FOR SELECT USING (true);

-- Permitir inserção/atualização pública (para simplificar MVP)
CREATE POLICY "Allow public insert estandes" ON estandes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert fotos" ON fotos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update fotos" ON fotos FOR UPDATE USING (true);
CREATE POLICY "Allow public insert compras" ON compras FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update compras" ON compras FOR UPDATE USING (true);
CREATE POLICY "Allow public read compras" ON compras FOR SELECT USING (true);

-- ============================================
-- 5. Storage bucket para as fotos
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-hd', 'fotos-hd', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public uploads fotos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id IN ('fotos', 'fotos-hd'));

CREATE POLICY "Allow public reads fotos" ON storage.objects
FOR SELECT USING (bucket_id IN ('fotos', 'fotos-hd'));

-- ============================================
-- 6. Função para gerar código único de estande
-- ============================================
CREATE OR REPLACE FUNCTION gerar_codigo_estande()
RETURNS TEXT AS $$
DECLARE
  novo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    -- Gera código tipo: ABC-3K9 (3 letras + 3 caracteres alfanuméricos)
    novo_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 3) || '-' ||
                         SUBSTRING(MD5(RANDOM()::TEXT), 1, 3));

    SELECT EXISTS(SELECT 1 FROM estandes WHERE codigo = novo_codigo) INTO existe;

    EXIT WHEN NOT existe;
  END LOOP;

  RETURN novo_codigo;
END;
$$ LANGUAGE plpgsql;
