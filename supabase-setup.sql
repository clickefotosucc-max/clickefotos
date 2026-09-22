-- ============================================
-- CLICKEFOTOS - Modelo por PESSOA INDIVIDUAL
-- ============================================
-- Apaga TUDO e recria
-- ============================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "p_storage_select" ON storage.objects;
  DROP POLICY IF EXISTS "p_storage_insert" ON storage.objects;
  DROP POLICY IF EXISTS "p_storage_update" ON storage.objects;
  DROP POLICY IF EXISTS "p_storage_delete" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public uploads fotos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public reads fotos" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP TABLE IF EXISTS public.fotos CASCADE;
DROP TABLE IF EXISTS public.pessoas CASCADE;
DROP TABLE IF EXISTS public.compras CASCADE;
DROP FUNCTION IF EXISTS public.gerar_codigo_pessoa() CASCADE;

-- ============================================
-- 1. Tabela de pessoas (cada pessoa tem seu código)
-- ============================================
CREATE TABLE public.pessoas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  turma TEXT,
  preco_por_foto DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Tabela de fotos (ligadas à pessoa)
-- ============================================
CREATE TABLE public.fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  url TEXT NOT NULL,
  url_hd TEXT NOT NULL,
  vendida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Tabela de compras
-- ============================================
CREATE TABLE public.compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  foto_id UUID REFERENCES public.fotos(id) ON DELETE CASCADE,
  cliente_email TEXT,
  cliente_nome TEXT,
  valor_pago DECIMAL(10,2),
  status TEXT DEFAULT 'pendente',
  download_token TEXT UNIQUE,
  downloads_realizados INT DEFAULT 0,
  max_downloads INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Função para gerar código único de pessoa
-- ============================================
CREATE OR REPLACE FUNCTION public.gerar_codigo_pessoa()
RETURNS TEXT AS $$
DECLARE
  novo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    novo_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 3) || '-' ||
                         SUBSTRING(MD5(RANDOM()::TEXT), 1, 3));
    SELECT EXISTS(SELECT 1 FROM public.pessoas WHERE codigo = novo_codigo) INTO existe;
    EXIT WHEN NOT existe;
  END LOOP;
  RETURN novo_codigo;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. RLS e Policies
-- ============================================
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p_read_pessoas" ON public.pessoas FOR SELECT USING (true);
CREATE POLICY "p_insert_pessoas" ON public.pessoas FOR INSERT WITH CHECK (true);
CREATE POLICY "p_update_pessoas" ON public.pessoas FOR UPDATE USING (true);
CREATE POLICY "p_delete_pessoas" ON public.pessoas FOR DELETE USING (true);

CREATE POLICY "p_read_fotos" ON public.fotos FOR SELECT USING (true);
CREATE POLICY "p_insert_fotos" ON public.fotos FOR INSERT WITH CHECK (true);
CREATE POLICY "p_update_fotos" ON public.fotos FOR UPDATE USING (true);
CREATE POLICY "p_delete_fotos" ON public.fotos FOR DELETE USING (true);

CREATE POLICY "p_read_compras" ON public.compras FOR SELECT USING (true);
CREATE POLICY "p_insert_compras" ON public.compras FOR INSERT WITH CHECK (true);
CREATE POLICY "p_update_compras" ON public.compras FOR UPDATE USING (true);

-- ============================================
-- 6. Storage
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-hd', 'fotos-hd', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "p_storage_select" ON storage.objects;
  DROP POLICY IF EXISTS "p_storage_insert" ON storage.objects;
  DROP POLICY IF EXISTS "p_storage_update" ON storage.objects;
  DROP POLICY IF EXISTS "p_storage_delete" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public uploads fotos" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public reads fotos" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "p_storage_select" ON storage.objects FOR SELECT USING (bucket_id IN ('fotos', 'fotos-hd'));
CREATE POLICY "p_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('fotos', 'fotos-hd'));
CREATE POLICY "p_storage_update" ON storage.objects FOR UPDATE USING (bucket_id IN ('fotos', 'fotos-hd'));
CREATE POLICY "p_storage_delete" ON storage.objects FOR DELETE USING (bucket_id IN ('fotos', 'fotos-hd'));

SELECT 'Sistema por Pessoa Individual configurado!' AS status,
       (SELECT COUNT(*) FROM public.pessoas) AS pessoas,
       (SELECT COUNT(*) FROM public.fotos) AS fotos;
