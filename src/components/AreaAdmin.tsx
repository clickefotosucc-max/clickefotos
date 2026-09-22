'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Pessoa } from '@/types'
import { ArrowLeft, Plus, Upload, Copy, Check, Trash2, User } from 'lucide-react'

interface Props {
  onVoltar: () => void
}

export default function AreaAdmin({ onVoltar }: Props) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null)
  const [fotosPessoa, setFotosPessoa] = useState<Foto[]>([])
  const [loading, setLoading] = useState(true)

  const [showNovaPessoa, setShowNovaPessoa] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTurma, setNovoTurma] = useState('')
  const [novoDescricao, setNovoDescricao] = useState('')
  const [novoPreco, setNovoPreco] = useState('5.00')
  const [criando, setCriando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [codigoCopiado, setCodigoCopiado] = useState(false)

  useEffect(() => {
    carregarPessoas()
  }, [])

  async function carregarPessoas() {
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPessoas(data)
    }
    setLoading(false)
  }

  async function carregarFotosPessoa(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa)
    const { data, error } = await supabase
      .from('fotos')
      .select('*')
      .eq('pessoa_id', pessoa.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFotosPessoa(data)
    }
  }

  function formatarPreco(valor: string): string {
    // Remove tudo que não é número
    const nums = valor.replace(/\D/g, '')
    // Converte para número e divide por 100 (pra ter casas decimais)
    const num = parseInt(nums || '0') / 100
    // Retorna com 2 casas decimais usando vírgula
    return num.toFixed(2).replace('.', ',')
  }

  function precoParaNumero(valorFormatado: string): number {
    // "5,00" -> 5.00
    return parseFloat(valorFormatado.replace(',', '.'))
  }

  async function criarPessoa(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome) {
      alert('Preencha o nome')
      return
    }

    setCriando(true)

    // Gerar código único
    let codigo = ''
    for (let i = 0; i < 10; i++) {
      const tentativa = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' +
                       Math.random().toString(36).substring(2, 5).toUpperCase()

      const { data: existe } = await supabase
        .from('pessoas')
        .select('id')
        .eq('codigo', tentativa)
        .single()

      if (!existe) {
        codigo = tentativa
        break
      }
    }

    if (!codigo) {
      alert('Não foi possível gerar código único')
      setCriando(false)
      return
    }

    const { error } = await supabase.from('pessoas').insert([{
      codigo,
      nome: novoNome,
      turma: novoTurma || null,
      descricao: novoDescricao || null,
      preco_por_foto: precoParaNumero(novoPreco),
    }])

    setCriando(false)

    if (error) {
      alert('Erro ao criar pessoa: ' + error.message)
      return
    }

    setShowNovaPessoa(false)
    setNovoNome('')
    setNovoTurma('')
    setNovoDescricao('')
    setNovoPreco('5.00')
    await carregarPessoas()
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
    if (!pessoaSelecionada || !arquivo || !titulo) {
      alert('Preencha título e selecione uma imagem')
      return
    }

    setUploading(true)

    const nomeBase = `${pessoaSelecionada.codigo}-${Date.now()}`

    // Upload da foto em alta resolução (HD)
    const { error: uploadHDError } = await supabase.storage
      .from('fotos-hd')
      .upload(`${nomeBase}-hd`, arquivo)

    if (uploadHDError) {
      alert('Erro no upload: ' + uploadHDError.message)
      setUploading(false)
      return
    }

    const { data: urlHDData } = supabase.storage
      .from('fotos-hd')
      .getPublicUrl(`${nomeBase}-hd`)

    // Upload da versão preview (mesma imagem por enquanto)
    const { error: uploadPreviewError } = await supabase.storage
      .from('fotos')
      .upload(`${nomeBase}-preview`, arquivo)

    if (uploadPreviewError) {
      alert('Erro no upload: ' + uploadPreviewError.message)
      setUploading(false)
      return
    }

    const { data: urlPreviewData } = supabase.storage
      .from('fotos')
      .getPublicUrl(`${nomeBase}-preview`)

    const { error: insertError } = await supabase.from('fotos').insert([{
      pessoa_id: pessoaSelecionada.id,
      titulo,
      descricao: descricao || null,
      url: urlPreviewData.publicUrl,
      url_hd: urlHDData.publicUrl,
    }])

    setUploading(false)

    if (insertError) {
      alert('Erro ao salvar: ' + insertError.message)
      return
    }

    setTitulo('')
    setDescricao('')
    setArquivo(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    await carregarFotosPessoa(pessoaSelecionada)
  }

  async function deletarFoto(foto: Foto) {
    if (!confirm('Deletar esta foto?')) return
    await supabase.from('fotos').delete().eq('id', foto.id)
    if (pessoaSelecionada) await carregarFotosPessoa(pessoaSelecionada)
  }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCodigoCopiado(true)
    setTimeout(() => setCodigoCopiado(false), 2000)
  }

  // VIEW: Lista de pessoas
  if (!pessoaSelecionada) {
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
                <User className="w-4 h-4" />
              </div>
              <span className="font-bold">Painel do Organizador</span>
            </div>
            <div className="w-24"></div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Pessoas cadastradas</h1>
              <p className="text-white/50 text-sm mt-1">
                {pessoas.length} {pessoas.length === 1 ? 'pessoa' : 'pessoas'} cadastradas
              </p>
            </div>
            <button
              onClick={() => setShowNovaPessoa(true)}
              className="btn-primary px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova pessoa
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
            </div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-20 glass-strong rounded-3xl">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-bold mb-2">Nenhuma pessoa ainda</h3>
              <p className="text-white/50 mb-6">Comece cadastrando a primeira pessoa</p>
              <button
                onClick={() => setShowNovaPessoa(true)}
                className="btn-primary px-6 py-3 rounded-xl font-semibold"
              >
                Cadastrar primeira pessoa
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pessoas.map((pessoa) => (
                <button
                  key={pessoa.id}
                  onClick={() => carregarFotosPessoa(pessoa)}
                  className="glass-strong rounded-2xl p-6 text-left hover:bg-white/[0.08] transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        copiarCodigo(pessoa.codigo)
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md glass text-xs font-mono cursor-pointer hover:bg-white/[0.08]"
                    >
                      {pessoa.codigo}
                      {codigoCopiado ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{pessoa.nome}</h3>
                  {pessoa.turma && <p className="text-sm text-white/50 mt-1">{pessoa.turma}</p>}
                  {pessoa.descricao && (
                    <p className="text-xs text-white/40 mt-2 line-clamp-2">{pessoa.descricao}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-white/40">R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')} / foto</span>
                    <span className="text-violet-400 group-hover:translate-x-1 transition-transform">Ver fotos →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {showNovaPessoa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowNovaPessoa(false)}>
            <div className="glass-strong rounded-3xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-2">Nova pessoa</h2>
              <p className="text-sm text-white/50 mb-6">
                Um código único será gerado automaticamente
              </p>

              <form onSubmit={criarPessoa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Nome completo *
                  </label>
                  <input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Fulano de Tal" className="w-full px-4 py-3 rounded-xl" required />
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
                    Descrição (opcional)
                  </label>
                  <input type="text" value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)}
                    placeholder="Ex: Participante da feira" className="w-full px-4 py-3 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Preço por foto (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-semibold">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={novoPreco}
                      onChange={(e) => setNovoPreco(formatarPreco(e.target.value))}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-3 rounded-xl font-mono"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">Use vírgula para centavos (ex: 5,00)</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowNovaPessoa(false)}
                    className="flex-1 py-3 rounded-xl glass hover:bg-white/[0.08] font-semibold">
                    Cancelar
                  </button>
                  <button type="submit" disabled={criando}
                    className="flex-1 btn-primary py-3 rounded-xl font-semibold disabled:opacity-50">
                    {criando ? 'Criando...' : 'Criar pessoa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // VIEW: Fotos de uma pessoa
  return (
    <div className="min-h-screen text-white">
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => setPessoaSelecionada(null)} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Todas as pessoas
          </button>
          <div className="text-center flex-1">
            <h2 className="font-bold text-lg">{pessoaSelecionada.nome}</h2>
            <p className="text-xs text-white/50 font-mono">{pessoaSelecionada.codigo}</p>
          </div>
          <button
            onClick={() => copiarCodigo(pessoaSelecionada.codigo)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs hover:bg-white/[0.08]"
          >
            {codigoCopiado ? <><Check className="w-3 h-3 text-green-400" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <section className="mb-12">
          <div className="glass-strong rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Adicionar foto</h3>

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
                  placeholder="Ex: Foto no estande" className="w-full px-4 py-3 rounded-xl" required />
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

        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h3 className="text-2xl font-bold">Fotos</h3>
            <span className="text-sm text-white/50">{fotosPessoa.length} {fotosPessoa.length === 1 ? 'foto' : 'fotos'}</span>
          </div>

          {fotosPessoa.length === 0 ? (
            <div className="text-center py-20 glass-strong rounded-3xl">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-white/50">Nenhuma foto ainda. Adicione a primeira acima.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {fotosPessoa.map((foto) => (
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
