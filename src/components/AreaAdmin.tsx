'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Pessoa } from '@/types'
import { aplicarMarcaDagua } from '@/lib/watermark'
import { ArrowLeft, Plus, Upload, Copy, Check, Trash2, User, Clock, Mail } from 'lucide-react'

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
  const [novoPreco, setNovoPreco] = useState('5,00')
  const [criando, setCriando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [previewsUrls, setPreviewsUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [progressoUpload, setProgressoUpload] = useState({ atual: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [codigoCopiado, setCodigoCopiado] = useState(false)

  useEffect(() => {
    carregarPessoas()
  }, [])

  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [chavePix, setChavePix] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    const configSalva = localStorage.getItem('clickefotos-config')
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva)
        setChavePix(config.chavePix || '')
        setWhatsapp(config.whatsapp || '')
      } catch {}
    }
  }, [])

  function salvarConfig() {
    localStorage.setItem('clickefotos-config', JSON.stringify({ chavePix, whatsapp }))
    setMostrarConfig(false)
    alert('Configurações salvas!')
  }

  const [mostrarPendentes, setMostrarPendentes] = useState(false)
  const [comprasPendentes, setComprasPendentes] = useState<any[]>([])

  async function carregarComprasPendentes() {
    const { data } = await supabase
      .from('compras')
      .select('*, foto:fotos(titulo, pessoa_id)')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })

    setComprasPendentes(data || [])
  }

  async function liberarCompra(compra: any) {
    // Marca a compra como paga
    await supabase
      .from('compras')
      .update({ status: 'pago' })
      .eq('id', compra.id)

    // Marca a foto como vendida
    await supabase
      .from('fotos')
      .update({ vendida: true })
      .eq('id', compra.foto_id)

    // Recarrega
    await carregarComprasPendentes()
    alert(`✅ Foto liberada para ${compra.cliente_nome} (${compra.cliente_email})`)
  }

  async function rejeitarCompra(compra: any) {
    if (!confirm(`Rejeitar compra de ${compra.cliente_nome}?`)) return
    await supabase
      .from('compras')
      .delete()
      .eq('id', compra.id)
    await carregarComprasPendentes()
  }

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
    // Limpa estado de upload quando troca de pessoa
    setArquivos([])
    setPreviewsUrls([])
    setTitulo('')
    setDescricao('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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

  // Helper: remove acentos e espaços
  function normalizarNome(nome: string): string {
    return nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/\s+/g, '') // remove espaços
  }

  // Gera próximo título no formato "NomeSequencial_001"
  function gerarProximoTitulo(): string {
    if (!pessoaSelecionada) return ''
    const nomeBase = normalizarNome(pessoaSelecionada.nome)
    const proximoNumero = fotosPessoa.length + 1
    return `${nomeBase}_${proximoNumero.toString().padStart(3, '0')}`
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    // Libera URLs antigas pra evitar memory leak
    setPreviewsUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url))
      return []
    })

    // Filtra só imagens
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Nenhuma imagem válida selecionada')
      return
    }

    setArquivos(imageFiles)

    // Gera previews
    const urls = imageFiles.map(f => URL.createObjectURL(f))
    setPreviewsUrls(urls)

    // Sugere título automaticamente se estiver vazio
    if (!titulo) {
      setTitulo(gerarProximoTitulo())
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    handleFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDiretorio() {
    // Cria input escondido com suporte a pasta
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    // @ts-ignore
    input.webkitdirectory = true
    // @ts-ignore
    input.directory = true
    input.accept = 'image/*'
    input.onchange = (e: any) => handleFiles(e.target.files)
    input.click()
  }

  async function handleUploadFoto(e: React.FormEvent) {
    e.preventDefault()
    if (!pessoaSelecionada || arquivos.length === 0) {
      alert('Selecione pelo menos uma imagem')
      return
    }

    setUploading(true)
    setProgressoUpload({ atual: 0, total: arquivos.length })

    try {
      // Lê chave PIX e WhatsApp pra salvar no metadata da compra
      const configSalva = localStorage.getItem('clickefotos-config')

      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i]
        setProgressoUpload({ atual: i + 1, total: arquivos.length })

        // Gera título individual: Nome_001, Nome_002...
        const numeroFoto = fotosPessoa.length + i + 1
        const tituloFoto = `${normalizarNome(pessoaSelecionada.nome)}_${numeroFoto.toString().padStart(3, '0')}`

        // Aplica marca d'água na imagem de preview
        const previewBlob = await aplicarMarcaDagua(arquivo, 'CLICKEFOTOS')
        const previewFile = new File([previewBlob], `preview-${arquivo.name}`, { type: arquivo.type })

        const nomeBase = `${pessoaSelecionada.codigo}-${Date.now()}-${i}`

        // Upload da foto ORIGINAL em alta resolução (HD) - SEM marca d'água
        const { error: uploadHDError } = await supabase.storage
          .from('fotos-hd')
          .upload(`${nomeBase}-hd`, arquivo)

        if (uploadHDError) throw new Error(`Erro no upload HD da foto ${i + 1}: ` + uploadHDError.message)

        const { data: urlHDData } = supabase.storage
          .from('fotos-hd')
          .getPublicUrl(`${nomeBase}-hd`)

        // Upload da versão COM marca d'água (preview público)
        const { error: uploadPreviewError } = await supabase.storage
          .from('fotos')
          .upload(`${nomeBase}-preview`, previewFile)

        if (uploadPreviewError) throw new Error(`Erro no upload preview da foto ${i + 1}: ` + uploadPreviewError.message)

        const { data: urlPreviewData } = supabase.storage
          .from('fotos')
          .getPublicUrl(`${nomeBase}-preview`)

        const { error: insertError } = await supabase.from('fotos').insert([{
          pessoa_id: pessoaSelecionada.id,
          titulo: tituloFoto,
          descricao: descricao || null,
          url: urlPreviewData.publicUrl,
          url_hd: urlHDData.publicUrl,
        }])

        if (insertError) throw new Error('Erro ao salvar foto ' + (i + 1) + ': ' + insertError.message)
      }

      // Limpa tudo
      setTitulo('')
      setDescricao('')
      setArquivos([])
      setPreviewsUrls([])
      if (fileInputRef.current) fileInputRef.current.value = ''

      await carregarFotosPessoa(pessoaSelecionada)
      alert(`✅ ${arquivos.length} foto(s) enviada(s) com sucesso!`)
    } catch (err: any) {
      alert(err.message || 'Erro ao processar fotos')
    } finally {
      setUploading(false)
    }
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
        <nav className="sticky top-0 z-50 surface-nav">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao site
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="font-bold">Painel do Organizador</span>
              <button
                onClick={async () => {
                  await carregarComprasPendentes()
                  setMostrarPendentes(true)
                }}
                className="px-3 py-1.5 rounded-lg surface-card hover:bg-slate-800 flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                Pendentes
              </button>
              <button
                onClick={() => setMostrarConfig(true)}
                className="px-3 py-1.5 rounded-lg surface-card hover:bg-slate-800"
              >
                ⚙️ PIX
              </button>
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
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Nova pessoa
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-10 h-10 border-4 border-slate-700/50 rounded-full animate-spin"></div>
            </div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-20 surface-card rounded-3xl">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-bold mb-2">Nenhuma pessoa ainda</h3>
              <p className="text-white/50 mb-6">Comece cadastrando a primeira pessoa</p>
              <button
                onClick={() => setShowNovaPessoa(true)}
                className="btn-primary"
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
                  className="surface-card rounded-2xl p-6 text-left hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        copiarCodigo(pessoa.codigo)
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md surface-card hover:bg-slate-800 font-mono cursor-pointer"
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
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
                    <span className="text-white/40">R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')} / foto</span>
                    <span className="text-blue-400 group-hover:translate-x-1 transition-transform">Ver fotos →</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        {showNovaPessoa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowNovaPessoa(false)}>
            <div className="surface-card rounded-3xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
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
                    placeholder="Ex: Fulano de Tal" className="input-base" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Turma
                  </label>
                  <input type="text" value={novoTurma} onChange={(e) => setNovoTurma(e.target.value)}
                    placeholder="Ex: 3º Ano A" className="input-base" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Descrição (opcional)
                  </label>
                  <input type="text" value={novoDescricao} onChange={(e) => setNovoDescricao(e.target.value)}
                    placeholder="Ex: Participante da feira" className="input-base" />
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
                    className="flex-1 py-3 rounded-xl surface-card hover:bg-slate-800 font-semibold">
                    Cancelar
                  </button>
                  <button type="submit" disabled={criando}
                    className="btn-primary flex-1 py-3 disabled:opacity-50">
                    {criando ? 'Criando...' : 'Criar pessoa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mostrarPendentes && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setMostrarPendentes(false)}
          >
            <div
              className="surface-card rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  Compras pendentes
                </h3>
                <button onClick={() => setMostrarPendentes(false)} className="w-8 h-8 rounded-full surface-card flex items-center justify-center hover:bg-slate-800">
                  <span className="text-xl">×</span>
                </button>
              </div>

              {comprasPendentes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3 opacity-50">✅</div>
                  <p className="text-white/60">Nenhuma compra pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comprasPendentes.map(compra => (
                    <div key={compra.id} className="surface-card rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{compra.cliente_nome}</div>
                          <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                            <Mail className="w-3 h-3" />
                            {compra.cliente_email}
                          </div>
                          <div className="text-sm text-white/70 mt-2">
                            📷 {compra.foto?.titulo || 'Foto'}
                          </div>
                          <div className="text-lg font-bold text-green-400 mt-1">
                            R$ {compra.valor_pago?.toFixed(2).replace('.', ',')}
                          </div>
                          <div className="text-xs text-white/40 mt-1">
                            {new Date(compra.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => liberarCompra(compra)}
                            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold whitespace-nowrap"
                          >
                            ✓ Liberar
                          </button>
                          <button
                            onClick={() => rejeitarCompra(compra)}
                            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold whitespace-nowrap"
                          >
                            ✗ Rejeitar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mostrarConfig && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setMostrarConfig(false)}
          >
            <div
              className="surface-card rounded-3xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2">⚙️ Configurações PIX</h3>
              <p className="text-sm text-white/60 mb-4">
                Sua chave PIX será usada para receber os pagamentos das compras de fotos.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="email@exemplo.com, CPF, CNPJ, celular ou chave aleatória"
                    className="input-base"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    Pode ser: email, CPF/CNPJ, telefone ou chave aleatória
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    WhatsApp para comprovante
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="input-base"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    Onde os clientes enviarão os comprovantes
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMostrarConfig(false)}
                    className="flex-1 py-3 rounded-xl surface-card hover:bg-slate-800 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarConfig}
                    className="btn-primary flex-1 py-3"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // VIEW: Fotos de uma pessoa
  return (
    <div className="min-h-screen text-white">
      <nav className="sticky top-0 z-50 surface-nav">
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg surface-card hover:bg-slate-800"
          >
            {codigoCopiado ? <><Check className="w-3 h-3 text-green-400" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <section className="mb-12">
          <div className="surface-card rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Adicionar foto</h3>

            <form onSubmit={handleUploadFoto} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-[#1E293B] transition-all overflow-hidden"
                >
                  {previewsUrls.length > 0 ? (
                    <div className="p-4">
                      <div className="text-sm text-white/60 mb-3 flex items-center justify-between">
                        <span>{arquivos.length} {arquivos.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}</span>
                        <span className="text-xs text-blue-400">Clique pra trocar</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                        {previewsUrls.map((url, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                            <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center gap-2 p-8">
                      <div className="text-5xl">📸</div>
                      <p className="text-white/80 font-semibold">Clique ou arraste fotos aqui</p>
                      <p className="text-sm text-white/50">Você pode selecionar várias de uma vez, ou uma pasta inteira</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-white/40 mt-2 flex items-center gap-2 flex-wrap">
                  <span>💡 <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">Ctrl+clique</kbd> pra várias fotos</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDiretorio()
                    }}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    ou selecione uma pasta inteira
                  </button>
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  {arquivos.length > 1 ? `Títulos serão automáticos: ${normalizarNome(pessoaSelecionada.nome)}_${(fotosPessoa.length + 1).toString().padStart(3, '0')} até _${(fotosPessoa.length + arquivos.length).toString().padStart(3, '0')}` : 'Título *'}
                </label>
                {arquivos.length <= 1 && (
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                    placeholder={gerarProximoTitulo()} className="input-base" />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Descrição (opcional, aplica a todas)
                </label>
                <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição das fotos..." className="input-base" />
              </div>

              <div className="md:col-span-2">
                <button type="submit" disabled={uploading || arquivos.length === 0}
                  className="btn-primary w-full py-3 disabled:opacity-50">
                  {uploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Enviando {progressoUpload.atual}/{progressoUpload.total}...
                    </>
                  ) : (
                    <><Upload className="w-4 h-4" /> Adicionar {arquivos.length > 1 ? `${arquivos.length} fotos` : 'foto'}</>
                  )}
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
            <div className="text-center py-20 surface-card rounded-3xl">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-white/50">Nenhuma foto ainda. Adicione a primeira acima.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {fotosPessoa.map((foto) => (
                <div key={foto.id} className="surface-card rounded-2xl overflow-hidden group">
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
