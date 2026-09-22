'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Estande } from '@/types'
import { ArrowLeft, Plus, Upload, Copy, Check, Trash2, Image as ImageIcon } from 'lucide-react'

interface Props {
  onVoltar: () => void
}

export default function AreaAdmin({ onVoltar }: Props) {
  const [estandes, setEstandes] = useState<Estande[]>([])
  const [estandeSelecionado, setEstandeSelecionado] = useState<Estande | null>(null)
  const [fotosEstande, setFotosEstande] = useState<Foto[]>([])
  const [loading, setLoading] = useState(true)

  // Form de novo estande
  const [showNovoEstande, setShowNovoEstande] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoResponsavel, setNovoResponsavel] = useState('')
  const [novoTurma, setNovoTurma] = useState('')
  const [novoDescricao, setNovoDescricao] = useState('')
  const [novoPreco, setNovoPreco] = useState('5.00')
  const [criando, setCriando] = useState(false)

  // Form de nova foto
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arquivoHD, setArquivoHD] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputHDRef = useRef<HTMLInputElement>(null)
  const [codigoCopiado, setCodigoCopiado] = useState(false)

  useEffect(() => {
    carregarEstandes()
  }, [])

  async function carregarEstandes() {
    const { data, error } = await supabase
      .from('estandes')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setEstandes(data)
    }
    setLoading(false)
  }

  async function carregarFotosEstande(estande: Estande) {
    setEstandeSelecionado(estande)
    const { data, error } = await supabase
      .from('fotos')
      .select('*')
      .eq('estande_id', estande.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFotosEstande(data)
    }
  }

  async function criarEstande(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome || !novoResponsavel) {
      alert('Preencha nome e responsável')
      return
    }

    setCriando(true)

    // Gerar código único
    const { data: codigoData, error: codigoError } = await supabase
      .rpc('gerar_codigo_estande')

    if (codigoError) {
      // Fallback: gerar manualmente
      const codigoManual = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' +
                          Math.random().toString(36).substring(2, 5).toUpperCase()
      await criarEstandeComCodigo(codigoManual)
      return
    }

    await criarEstandeComCodigo(codigoData)
  }

  async function criarEstandeComCodigo(codigo: string) {
    const { error } = await supabase.from('estandes').insert([{
      codigo,
      nome: novoNome,
      responsavel: novoResponsavel,
      turma: novoTurma || null,
      descricao: novoDescricao || null,
      preco_por_foto: parseFloat(novoPreco),
    }])

    setCriando(false)

    if (error) {
      alert('Erro ao criar estande: ' + error.message)
      return
    }

    setShowNovoEstande(false)
    setNovoNome('')
    setNovoResponsavel('')
    setNovoTurma('')
    setNovoDescricao('')
    setNovoPreco('5.00')
    await carregarEstandes()
  }

  function handleFile(file: File | null) {
    setArquivo(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  async function handleUploadFoto(e: React.FormEvent) {
    e.preventDefault()
    if (!estandeSelecionado || !arquivo || !titulo) {
      alert('Preencha título e selecione uma imagem')
      return
    }

    setUploading(true)

    // Upload da foto padrão (preview)
    const nomeBase = `${estandeSelecionado.codigo}-${Date.now()}`
    const { error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(`${nomeBase}-preview`, arquivo)

    if (uploadError) {
      alert('Erro no upload: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('fotos')
      .getPublicUrl(`${nomeBase}-preview`)

    // Upload da versão HD (opcional)
    let urlHD = urlData.publicUrl
    if (arquivoHD) {
      const { error: uploadHDError } = await supabase.storage
        .from('fotos-hd')
        .upload(`${nomeBase}-hd`, arquivoHD)

      if (!uploadHDError) {
        const { data: urlHDData } = supabase.storage
          .from('fotos-hd')
          .getPublicUrl(`${nomeBase}-hd`)
        urlHD = urlHDData.publicUrl
      }
    } else {
      // Se não forneceu HD, usa a mesma imagem
      const { error: copyError } = await supabase.storage
        .from('fotos-hd')
        .upload(`${nomeBase}-hd`, arquivo)

      if (!copyError) {
        const { data: urlHDData } = supabase.storage
          .from('fotos-hd')
          .getPublicUrl(`${nomeBase}-hd`)
        urlHD = urlHDData.publicUrl
      }
    }

    // Salvar no banco
    const { error: insertError } = await supabase.from('fotos').insert([{
      estande_id: estandeSelecionado.id,
      titulo,
      descricao: descricao || null,
      url: urlData.publicUrl,
      url_hd: urlHD,
    }])

    setUploading(false)

    if (insertError) {
      alert('Erro ao salvar: ' + insertError.message)
      return
    }

    setTitulo('')
    setDescricao('')
    setArquivo(null)
    setArquivoHD(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (fileInputHDRef.current) fileInputHDRef.current.value = ''

    await carregarFotosEstande(estandeSelecionado)
  }

  async function deletarFoto(foto: Foto) {
    if (!confirm('Tem certeza que deseja deletar esta foto?')) return

    await supabase.from('fotos').delete().eq('id', foto.id)
    if (estandeSelecionado) {
      await carregarFotosEstande(estandeSelecionado)
    }
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCodigoCopiado(true)
    setTimeout(() => setCodigoCopiado(false), 2000)
  }

  // ============================================
  // VIEW: Lista de estandes
  // ============================================
  if (!estandeSelecionado) {
    return (
      <div className="min-h-screen text-white">
        <nav className="sticky top-0 z-50 glass border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao site
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="font-bold">Painel do Organizador</span>
            </div>
            <div className="w-24"></div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Estandes cadastrados</h1>
              <p className="text-white/50 text-sm mt-1">
                {estandes.length} {estandes.length === 1 ? 'estande' : 'estandes'} • {estandes.reduce((acc, e) => acc + 1, 0)} ativos
              </p>
            </div>
            <button
              onClick={() => setShowNovoEstande(true)}
              className="btn-primary px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo estande
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
            </div>
          ) : estandes.length === 0 ? (
            <div className="text-center py-20 glass-strong rounded-3xl">
              <div className="text-6xl mb-4">🏪</div>
              <h3 className="text-xl font-bold mb-2">Nenhum estande ainda</h3>
              <p className="text-white/50 mb-6">Comece criando o primeiro estande da feira</p>
              <button
                onClick={() => setShowNovoEstande(true)}
                className="btn-primary px-6 py-3 rounded-xl font-semibold"
              >
                Criar primeiro estande
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {estandes.map((estande) => (
                <button
                  key={estande.id}
                  onClick={() => carregarFotosEstande(estande)}
                  className="glass-strong rounded-2xl p-6 text-left hover:bg-white/[0.08] transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl">
                      🏪
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        copiarCodigo(estande.codigo)
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md glass text-xs font-mono cursor-pointer hover:bg-white/[0.08]"
                    >
                      {estande.codigo}
                      {codigoCopiado ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{estande.nome}</h3>
                  <p className="text-sm text-white/50 mt-1">@{estande.responsavel}</p>
                  {estande.turma && <p className="text-xs text-white/40 mt-1">{estande.turma}</p>}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-white/40">R$ {estande.preco_por_foto.toFixed(2)} / foto</span>
                    <span className="text-violet-400 group-hover:translate-x-1 transition-transform">Ver fotos →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {/* Modal: Novo Estande */}
        {showNovoEstande && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowNovoEstande(false)}>
            <div className="glass-strong rounded-3xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-2">Novo estande</h2>
              <p className="text-sm text-white/50 mb-6">
                Um código único será gerado automaticamente para os clientes acessarem as fotos
              </p>

              <form onSubmit={criarEstande} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Nome do estande *
                  </label>
                  <input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: EcoTech" className="w-full px-4 py-3 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Responsável *
                  </label>
                  <input type="text" value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)}
                    placeholder="Ex: João Silva" className="w-full px-4 py-3 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Turma
                  </label>
                  <input type="text" value={novoTurma} onChange={(e) => setNovoTurma(e.target.value)}
                    placeholder="Ex: 3º Ano A" className="w-full px-4 py-3 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Descrição
                  </label>
                  <input type="text" value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)}
                    placeholder="Sobre o que é o estande..." className="w-full px-4 py-3 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Preço por foto (R$)
                  </label>
                  <input type="number" step="0.01" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl" />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowNovoEstande(false)}
                    className="flex-1 py-3 rounded-xl glass hover:bg-white/[0.08] font-semibold">
                    Cancelar
                  </button>
                  <button type="submit" disabled={criando}
                    className="flex-1 btn-primary py-3 rounded-xl font-semibold disabled:opacity-50">
                    {criando ? 'Criando...' : 'Criar estande'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // VIEW: Fotos de um estande específico
  // ============================================
  return (
    <div className="min-h-screen text-white">
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => setEstandeSelecionado(null)} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Todos os estandes
          </button>
          <div className="text-center flex-1">
            <h2 className="font-bold text-lg">{estandeSelecionado.nome}</h2>
            <p className="text-xs text-white/50 font-mono">{estandeSelecionado.codigo}</p>
          </div>
          <button
            onClick={() => copiarCodigo(estandeSelecionado.codigo)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs hover:bg-white/[0.08]"
          >
            {codigoCopiado ? <><Check className="w-3 h-3 text-green-400" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar código</>}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Upload de foto */}
        <section className="mb-12">
          <div className="glass-strong rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Adicionar foto ao estande</h3>

            <form onSubmit={handleUploadFoto} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 bg-white/[0.02] transition-all overflow-hidden"
                >
                  {previewUrl ? (
                    <div className="relative aspect-video">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center gap-2">
                      <div className="text-4xl">📸</div>
                      <p className="text-white/60">Clique para selecionar a foto</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Título *
                </label>
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Estande principal" className="w-full px-4 py-3 rounded-xl" required />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Versão HD (opcional)
                </label>
                <input
                  ref={fileInputHDRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setArquivoHD(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 rounded-xl text-sm"
                />
                <p className="text-xs text-white/40 mt-1">Se vazio, usa a mesma foto acima</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Descrição
                </label>
                <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição da foto..." className="w-full px-4 py-3 rounded-xl" />
              </div>

              <div className="md:col-span-2">
                <button type="submit" disabled={uploading}
                  className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  {uploading ? <><span className="animate-spin">⏳</span> Enviando...</> : <><Upload className="w-4 h-4" /> Adicionar foto</>}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Lista de fotos */}
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h3 className="text-2xl font-bold">Fotos do estande</h3>
            <span className="text-sm text-white/50">{fotosEstande.length} {fotosEstande.length === 1 ? 'foto' : 'fotos'}</span>
          </div>

          {fotosEstande.length === 0 ? (
            <div className="text-center py-20 glass-strong rounded-3xl">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-white/50">Nenhuma foto ainda. Comece adicionando acima.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {fotosEstande.map((foto) => (
                <div key={foto.id} className="glass-strong rounded-2xl overflow-hidden group">
                  <div className="relative aspect-[4/3]">
                    <img src={foto.url} alt={foto.titulo} className="w-full h-full object-cover" />
                    {foto.vendida && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-semibold bg-green-500/90 text-white">
                        Vendida
                      </div>
                    )}
                    <button
                      onClick={() => deletarFoto(foto)}
                      className="absolute top-2 left-2 w-8 h-8 rounded-md bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{foto.titulo}</p>
                    {foto.descricao && <p className="text-xs text-white/50 truncate">{foto.descricao}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
