'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Pessoa } from '@/types'
import { aplicarMarcaDagua } from '@/lib/watermark'
import { gerarLinkWhatsApp, gerarLinkNotificacaoFotos } from '@/lib/whatsapp'
import Header from '@/components/Header'
import {
  Plus, Upload, Copy, Check, Trash2, Clock, X, Settings, FolderUp,
  LayoutDashboard, CalendarRange, Wallet, Ticket, ChevronRight,
  MessageCircle, Mail, Hash, Sparkles, Edit,
} from 'lucide-react'

interface Props {
  onVoltar: () => void
}

type Section = 'overview' | 'eventos' | 'vendas' | 'cupons'

export default function AreaAdmin({ onVoltar }: Props) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null)
  const [fotosPessoa, setFotosPessoa] = useState<Foto[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<Section>('overview')

  const [showNovaPessoa, setShowNovaPessoa] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTurma, setNovoTurma] = useState('')
  const [novoDescricao, setNovoDescricao] = useState('')
  const [novoPreco, setNovoPreco] = useState('5,00')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [criando, setCriando] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [previewsUrls, setPreviewsUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [progressoUpload, setProgressoUpload] = useState({ atual: 0, total: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [codigoCopiado, setCodigoCopiado] = useState(false)

  // Estado de edição da pessoa
  const [showEditarPessoa, setShowEditarPessoa] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editTurma, setEditTurma] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editPreco, setEditPreco] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

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
    await supabase
      .from('compras')
      .update({ status: 'pago' })
      .eq('id', compra.id)
    await supabase
      .from('fotos')
      .update({ vendida: true })
      .eq('id', compra.foto_id)
    await carregarComprasPendentes()
    alert(`Foto liberada para ${compra.cliente_nome} (${compra.cliente_email})`)
  }

  async function rejeitarCompra(compra: any) {
    if (!confirm(`Rejeitar compra de ${compra.cliente_nome}?`)) return
    await supabase.from('compras').delete().eq('id', compra.id)
    await carregarComprasPendentes()
  }

  async function carregarPessoas() {
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setPessoas(data)
    setLoading(false)
  }

  async function carregarFotosPessoa(pessoa: Pessoa) {
    setPessoaSelecionada(pessoa)
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
    if (!error && data) setFotosPessoa(data)
  }

  function formatarPreco(valor: string): string {
    const nums = valor.replace(/\D/g, '')
    const num = parseInt(nums || '0') / 100
    return num.toFixed(2).replace('.', ',')
  }

  function precoParaNumero(valorFormatado: string): number {
    return parseFloat(valorFormatado.replace(',', '.'))
  }

  async function criarPessoa(e: React.FormEvent) {
    e.preventDefault()
    if (!novoNome) { alert('Preencha o nome'); return }
    setCriando(true)
    let codigo = ''
    for (let i = 0; i < 10; i++) {
      const tentativa = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' +
        Math.random().toString(36).substring(2, 5).toUpperCase()
      const { data: existe } = await supabase
        .from('pessoas')
        .select('id')
        .eq('codigo', tentativa)
        .single()
      if (!existe) { codigo = tentativa; break }
    }
    if (!codigo) { alert('Não foi possível gerar código único'); setCriando(false); return }

    const { error } = await supabase.from('pessoas').insert([{
      codigo, nome: novoNome,
      turma: novoTurma || null, descricao: novoDescricao || null,
      preco_por_foto: precoParaNumero(novoPreco),
      telefone: novoTelefone || null,
    }])
    setCriando(false)
    if (error) { alert('Erro ao criar pessoa: ' + error.message); return }

    setShowNovaPessoa(false)
    setNovoNome(''); setNovoTurma(''); setNovoDescricao(''); setNovoPreco('5,00'); setNovoTelefone('')
    await carregarPessoas()
  }

  function abrirEdicao() {
    if (!pessoaSelecionada) return
    setEditNome(pessoaSelecionada.nome)
    setEditTurma(pessoaSelecionada.turma || '')
    setEditDescricao(pessoaSelecionada.descricao || '')
    setEditPreco(pessoaSelecionada.preco_por_foto.toFixed(2).replace('.', ','))
    setEditTelefone(pessoaSelecionada.telefone || '')
    setShowEditarPessoa(true)
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    if (!editNome.trim()) { alert('Preencha o nome'); return }
    if (!pessoaSelecionada) return

    setSalvandoEdicao(true)
    const payload = {
      nome: editNome.trim(),
      turma: editTurma.trim() || null,
      descricao: editDescricao.trim() || null,
      preco_por_foto: precoParaNumero(editPreco),
      telefone: editTelefone.trim() || null,
    }
    const { error } = await supabase
      .from('pessoas')
      .update(payload)
      .eq('id', pessoaSelecionada.id)

    setSalvandoEdicao(false)

    if (error) { alert('Erro ao salvar: ' + error.message); return }

    const pessoaAtualizada: Pessoa = { ...pessoaSelecionada, ...payload }
    setPessoaSelecionada(pessoaAtualizada)
    setPessoas(prev => prev.map(p => p.id === pessoaAtualizada.id ? pessoaAtualizada : p))

    setShowEditarPessoa(false)
  }

  function normalizarNome(nome: string): string {
    return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')
  }
  function gerarProximoTitulo(): string {
    if (!pessoaSelecionada) return ''
    return `${normalizarNome(pessoaSelecionada.nome)}_${(fotosPessoa.length + 1).toString().padStart(3, '0')}`
  }
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setPreviewsUrls(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return [] })
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) { alert('Nenhuma imagem válida selecionada'); return }
    setArquivos(imageFiles)
    setPreviewsUrls(imageFiles.map(f => URL.createObjectURL(f)))
    if (!titulo) setTitulo(gerarProximoTitulo())
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    handleFiles(e.dataTransfer.files)
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
  }
  function handleDiretorio() {
    const input = document.createElement('input')
    input.type = 'file'; input.multiple = true
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
    if (!pessoaSelecionada || arquivos.length === 0) { alert('Selecione pelo menos uma imagem'); return }
    setUploading(true)
    setProgressoUpload({ atual: 0, total: arquivos.length })
    try {
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i]
        setProgressoUpload({ atual: i + 1, total: arquivos.length })
        const numeroFoto = fotosPessoa.length + i + 1
        const tituloFoto = `${normalizarNome(pessoaSelecionada.nome)}_${numeroFoto.toString().padStart(3, '0')}`
        const previewBlob = await aplicarMarcaDagua(arquivo, 'CLICKEFOTOS')
        const previewFile = new File([previewBlob], `preview-${arquivo.name}`, { type: arquivo.type })
        const nomeBase = `${pessoaSelecionada.codigo}-${Date.now()}-${i}`

        const { error: uploadHDError } = await supabase.storage.from('fotos-hd').upload(`${nomeBase}-hd`, arquivo)
        if (uploadHDError) throw new Error(`Erro no upload HD da foto ${i + 1}: ` + uploadHDError.message)
        const { data: urlHDData } = supabase.storage.from('fotos-hd').getPublicUrl(`${nomeBase}-hd`)

        const { error: uploadPreviewError } = await supabase.storage.from('fotos').upload(`${nomeBase}-preview`, previewFile)
        if (uploadPreviewError) throw new Error(`Erro no upload preview da foto ${i + 1}: ` + uploadPreviewError.message)
        const { data: urlPreviewData } = supabase.storage.from('fotos').getPublicUrl(`${nomeBase}-preview`)

        const { error: insertError } = await supabase.from('fotos').insert([{
          pessoa_id: pessoaSelecionada.id, titulo: tituloFoto,
          descricao: descricao || null,
          url: urlPreviewData.publicUrl, url_hd: urlHDData.publicUrl,
        }])
        if (insertError) throw new Error('Erro ao salvar foto ' + (i + 1) + ': ' + insertError.message)
      }
      setTitulo(''); setDescricao(''); setArquivos([]); setPreviewsUrls([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      await carregarFotosPessoa(pessoaSelecionada)
      alert(`${arquivos.length} foto(s) enviada(s) com sucesso!`)
    } catch (err: any) { alert(err.message || 'Erro ao processar fotos') }
    finally { setUploading(false) }
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

  const navItems = [
    { label: 'Resgatar Fotos', onClick: onVoltar },
    { label: 'Minha Galeria' },
    { label: 'Painel do Fotógrafo', active: true },
  ]

  /* ---------- LISTA DE PESSOAS (Visão Geral) ---------- */
  if (!pessoaSelecionada && section === 'overview') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header
          variant="admin"
          onVoltar={onVoltar}
          navItems={navItems}
          badgeEvento={`${pessoas.length} participantes cadastrados`}
        />

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-10 grid lg:grid-cols-[240px_1fr] gap-8">
          {/* SIDEBAR ESQUERDA */}
          <aside>
            <p className="eyebrow mb-3 px-3">PAINEL</p>
            <nav className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Visão Geral" active onClick={() => setSection('overview')} />
              <SidebarItem icon={CalendarRange} label="Eventos & Álbuns" onClick={() => setSection('eventos')} />
              <SidebarItem
                icon={Wallet} label="Vendas & PIX"
                onClick={async () => { await carregarComprasPendentes(); setMostrarPendentes(true) }}
                badge={comprasPendentes.length > 0 ? comprasPendentes.length : undefined}
              />
              <SidebarItem icon={Ticket} label="Códigos & Cupons" onClick={() => setSection('cupons')} />
              <SidebarItem icon={Settings} label="Chave PIX" onClick={() => setMostrarConfig(true)} />
            </nav>

            <div className="rule pt-6 mt-6">
              <p className="eyebrow mb-3 px-3">EVENTO ATUAL</p>
              <div className="card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-dot" />
                  <span className="text-xs text-ink-soft">EM ANDAMENTO</span>
                </div>
                <p className="font-display text-sm text-ink leading-tight">
                  Feira de Empreendedorismo 2025
                </p>
                <p className="text-xs text-ink-soft mt-1">Estúdio Acreditar</p>
              </div>
            </div>
          </aside>

          {/* CONTEÚDO PRINCIPAL */}
          <main>
            <header className="flex items-end justify-between mb-8 rule-bottom pb-6">
              <div>
                <p className="eyebrow mb-2">GESTÃO DE PARTICIPANTES</p>
                <h1 className="font-display text-3xl md:text-4xl font-medium text-ink">
                  Pessoas
                </h1>
                <p className="text-ink-soft mt-2 text-sm">
                  {pessoas.length} {pessoas.length === 1 ? 'cadastro ativo' : 'cadastros ativos'}
                </p>
              </div>
              <button onClick={() => setShowNovaPessoa(true)} className="btn-amber-pill">
                <Plus className="w-4 h-4" />
                Nova pessoa
              </button>
            </header>

            {loading ? (
              <div className="text-center py-20 text-ink-soft">Carregando…</div>
            ) : pessoas.length === 0 ? (
              <EmptyStateNova onClick={() => setShowNovaPessoa(true)} />
            ) : (
              <ul className="space-y-3">
                {pessoas.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => carregarFotosPessoa(p)}
                      className="w-full card !p-4 flex items-center gap-4 hover:border-amber/40 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber to-amber-deep text-canvas text-sm font-bold flex items-center justify-center shrink-0">
                        {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-display text-base font-medium text-ink truncate">
                            {p.nome}
                          </span>
                          {p.turma && (
                            <span className="badge badge-muted text-[10px]">{p.turma}</span>
                          )}
                        </div>
                        {p.descricao && (
                          <p className="text-xs text-ink-soft line-clamp-1">{p.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <code className="font-mono text-xs text-ink-soft px-2 py-1 bg-surface-2 rounded">
                          {p.codigo}
                        </code>
                        <span className="font-display text-sm text-amber">
                          R$ {p.preco_por_foto.toFixed(2).replace('.', ',')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-ink-soft group-hover:text-amber transition-colors" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>

        {/* MODAL: NOVA PESSOA */}
        {showNovaPessoa && (
          <ModalSheet onClose={() => setShowNovaPessoa(false)}>
            <header className="rule-bottom pb-4 mb-6">
              <p className="eyebrow mb-2">Novo cadastro</p>
              <h2 className="font-display text-2xl font-medium text-ink">Nova pessoa</h2>
              <p className="text-ink-soft text-sm mt-1">
                Um código único será gerado automaticamente.
              </p>
            </header>

            <form onSubmit={criarPessoa} className="space-y-6">
              <FormField label="Nome completo *" htmlFor="novo-nome">
                <input
                  id="novo-nome" type="text" value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Lucas Emanuel da Silva"
                  className="input-editorial" required
                />
              </FormField>
              <FormField label="Turma" htmlFor="novo-turma">
                <input
                  id="novo-turma" type="text" value={novoTurma}
                  onChange={(e) => setNovoTurma(e.target.value)}
                  placeholder="Ex: 3º Ano A"
                  className="input-editorial"
                />
              </FormField>
              <FormField label="Descrição (opcional)" htmlFor="novo-desc">
                <input
                  id="novo-desc" type="text" value={novoDescricao}
                  onChange={(e) => setNovoDescricao(e.target.value)}
                  placeholder="Ex: Participante da feira"
                  className="input-editorial"
                />
              </FormField>
              <FormField label="Telefone (opcional)" htmlFor="novo-telefone">
                <input
                  id="novo-telefone"
                  type="tel"
                  inputMode="tel"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-editorial"
                />
                <p className="text-xs text-ink-soft mt-2">Usado para enviar o link de resgate pelo WhatsApp.</p>
              </FormField>
              <FormField label="Preço por foto (R$)" htmlFor="novo-preco">
                <input
                  id="novo-preco" type="text" inputMode="decimal" value={novoPreco}
                  onChange={(e) => setNovoPreco(formatarPreco(e.target.value))}
                  placeholder="0,00"
                  className="input-editorial font-mono"
                />
                <p className="text-xs text-ink-soft mt-2">Use vírgula para centavos (ex: 5,00).</p>
              </FormField>

              <div className="flex items-center gap-4 pt-2">
                <button type="button" onClick={() => setShowNovaPessoa(false)} className="btn-ghost-editorial">
                  Cancelar
                </button>
                <button type="submit" disabled={criando} className="btn-ink disabled:opacity-40">
                  {criando ? 'Criando…' : 'Criar pessoa'}
                </button>
              </div>
            </form>
          </ModalSheet>
        )}

        {/* MODAL: EDITAR PESSOA */}
        {showEditarPessoa && (
          <ModalSheet onClose={() => setShowEditarPessoa(false)}>
            <header className="rule-bottom pb-4 mb-6">
              <p className="eyebrow mb-2">Edição de cadastro</p>
              <h2 className="font-display text-2xl font-medium text-ink">Editar pessoa</h2>
              <p className="text-ink-soft text-sm mt-1">
                Altere os dados do participante. O código permanece inalterado.
              </p>
            </header>

            <form onSubmit={salvarEdicao} className="space-y-6">
              <FormField label="Nome completo *" htmlFor="edit-nome">
                <input
                  id="edit-nome"
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Ex: Lucas Emanuel da Silva"
                  className="input-editorial"
                  required
                />
              </FormField>

              <FormField label="Turma" htmlFor="edit-turma">
                <input
                  id="edit-turma"
                  type="text"
                  value={editTurma}
                  onChange={(e) => setEditTurma(e.target.value)}
                  placeholder="Ex: 3º Ano A"
                  className="input-editorial"
                />
              </FormField>

              <FormField label="Descrição (opcional)" htmlFor="edit-desc">
                <input
                  id="edit-desc"
                  type="text"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  placeholder="Ex: Participante da feira"
                  className="input-editorial"
                />
              </FormField>

              <FormField label="Telefone (opcional)" htmlFor="edit-telefone">
                <input
                  id="edit-telefone"
                  type="tel"
                  inputMode="tel"
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-editorial"
                />
                <p className="text-xs text-ink-soft mt-2">Usado para enviar o link de resgate pelo WhatsApp.</p>
              </FormField>

              <FormField label="Preço por foto (R$)" htmlFor="edit-preco">
                <input
                  id="edit-preco"
                  type="text"
                  inputMode="decimal"
                  value={editPreco}
                  onChange={(e) => setEditPreco(formatarPreco(e.target.value))}
                  placeholder="0,00"
                  className="input-editorial font-mono"
                />
                <p className="text-xs text-ink-soft mt-2">Use vírgula para centavos (ex: 5,00).</p>
              </FormField>

              <div className="flex items-center gap-4 pt-2">
                <button type="button" onClick={() => setShowEditarPessoa(false)} className="btn-ghost-editorial">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEdicao} className="btn-ink disabled:opacity-40">
                  {salvandoEdicao ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </ModalSheet>
        )}

        {/* MODAL: PENDENTES */}
        {mostrarPendentes && (
          <ModalSheet size="lg" onClose={() => setMostrarPendentes(false)}>
            <header className="flex items-baseline justify-between rule-bottom pb-4 mb-6">
              <div>
                <p className="eyebrow mb-2">Confirmação manual</p>
                <h3 className="font-display text-2xl font-medium text-ink">Compras pendentes</h3>
              </div>
              <button onClick={() => setMostrarPendentes(false)} className="btn-ghost-editorial">
                <X className="w-4 h-4" />
              </button>
            </header>

            {comprasPendentes.length === 0 ? (
              <p className="py-8 text-center text-ink-soft">Nenhuma compra pendente.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {comprasPendentes.map((compra) => (
                  <li key={compra.id} className="py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base font-medium text-ink">{compra.cliente_nome}</p>
                      <p className="text-sm text-ink-soft">{compra.cliente_email}</p>
                      <p className="text-sm mt-2 text-ink">
                        Foto: <em className="italic">{compra.foto?.titulo || '—'}</em>
                      </p>
                      <p className="font-display text-lg font-medium mt-1 text-amber">
                        R$ {compra.valor_pago?.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-ink-soft mt-1">
                        {new Date(compra.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => liberarCompra(compra)} className="btn-amber-pill text-sm">
                        <Check className="w-3.5 h-3.5" />
                        Liberar
                      </button>
                      <button onClick={() => rejeitarCompra(compra)} className="btn-link text-sm text-crimson">
                        Rejeitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ModalSheet>
        )}

        {/* MODAL: CONFIG PIX */}
        {mostrarConfig && (
          <ModalSheet onClose={() => setMostrarConfig(false)}>
            <header className="rule-bottom pb-4 mb-6">
              <p className="eyebrow mb-2">Configurações</p>
              <h3 className="font-display text-2xl font-medium text-ink">Chave PIX e WhatsApp</h3>
              <p className="text-ink-soft text-sm mt-1">
                Sua chave PIX será usada para receber os pagamentos.
              </p>
            </header>

            <div className="space-y-6">
              <FormField label="Chave PIX">
                <input
                  type="text" value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="email@exemplo.com, CPF, CNPJ, celular ou chave aleatória"
                  className="input-editorial"
                />
              </FormField>
              <FormField label="WhatsApp para comprovante">
                <input
                  type="text" value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-editorial"
                />
                <p className="text-xs text-ink-soft mt-2">Onde os clientes enviarão os comprovantes.</p>
              </FormField>

              <div className="flex items-center gap-4 pt-2">
                <button onClick={() => setMostrarConfig(false)} className="btn-ghost-editorial">Cancelar</button>
                <button onClick={salvarConfig} className="btn-ink">Salvar</button>
              </div>
            </div>
          </ModalSheet>
        )}
      </div>
    )
  }

  /* ---------- EVENTOS & ÁLBUNS (placeholder visual) ---------- */
  if (section === 'eventos') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header variant="admin" onVoltar={onVoltar} navItems={navItems} />
        <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-10 grid lg:grid-cols-[240px_1fr] gap-8">
          <aside>
            <p className="eyebrow mb-3 px-3">PAINEL</p>
            <nav className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Visão Geral" onClick={() => setSection('overview')} />
              <SidebarItem icon={CalendarRange} label="Eventos & Álbuns" active />
              <SidebarItem icon={Wallet} label="Vendas & PIX" />
              <SidebarItem icon={Ticket} label="Códigos & Cupons" onClick={() => setSection('cupons')} />
              <SidebarItem icon={Settings} label="Chave PIX" onClick={() => setMostrarConfig(true)} />
            </nav>
          </aside>
          <main>
            <header className="rule-bottom pb-6 mb-8">
              <p className="eyebrow mb-2">COBERTURA</p>
              <h1 className="font-display text-3xl md:text-4xl font-medium text-ink">
                Eventos & Álbuns
              </h1>
              <p className="text-ink-soft mt-2 text-sm">
                Cada pessoa cadastrada já vira um álbum automático.
              </p>
            </header>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pessoas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => carregarFotosPessoa(p)}
                  className="card !p-0 text-left hover:border-amber/40 transition-colors group overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-surface-2 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber/15 to-surface-1" />
                    <span className="absolute top-3 left-3 badge badge-amber">ÁLBUM</span>
                  </div>
                  <div className="p-4">
                    <p className="font-display text-base font-medium text-ink mb-1">{p.nome}</p>
                    <code className="font-mono text-xs text-ink-soft">{p.codigo}</code>
                  </div>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    )
  }

  /* ---------- CÓDIGOS & CUPONS (placeholder) ---------- */
  if (section === 'cupons') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header variant="admin" onVoltar={onVoltar} navItems={navItems} />
        <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-10 grid lg:grid-cols-[240px_1fr] gap-8">
          <aside>
            <p className="eyebrow mb-3 px-3">PAINEL</p>
            <nav className="space-y-1">
              <SidebarItem icon={LayoutDashboard} label="Visão Geral" onClick={() => setSection('overview')} />
              <SidebarItem icon={CalendarRange} label="Eventos & Álbuns" onClick={() => setSection('eventos')} />
              <SidebarItem icon={Wallet} label="Vendas & PIX" />
              <SidebarItem icon={Ticket} label="Códigos & Cupons" active />
              <SidebarItem icon={Settings} label="Chave PIX" onClick={() => setMostrarConfig(true)} />
            </nav>
          </aside>
          <main>
            <header className="rule-bottom pb-6 mb-8">
              <p className="eyebrow mb-2">ACESSO</p>
              <h1 className="font-display text-3xl md:text-4xl font-medium text-ink">Códigos & Cupons</h1>
              <p className="text-ink-soft mt-2 text-sm">
                Códigos de resgate são gerados automaticamente por cadastro.
              </p>
            </header>
            <div className="card !p-12 text-center">
              <Hash className="w-12 h-12 mx-auto mb-4 text-amber" strokeWidth={1.4} />
              <p className="font-display text-xl text-ink mb-2">Cupons em breve</p>
              <p className="text-ink-soft text-sm max-w-md mx-auto">
                A funcionalidade de cupons de desconto e códigos personalizados
                será lançada em uma próxima versão.
              </p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  /* ---------- DETALHE DE UMA PESSOA (UPLOAD + GALERIA + SIDEBAR DIREITA) ---------- */
  if (!pessoaSelecionada) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        variant="admin"
        onVoltar={() => setPessoaSelecionada(null)}
        navItems={navItems}
      />

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-10">
        {/* BREADCRUMB + AÇÕES */}
        <header className="mb-8">
          <nav className="flex items-center gap-2 text-xs text-ink-soft mb-3">
            <button onClick={() => setPessoaSelecionada(null)} className="hover:text-amber transition-colors">
              Pessoas
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-ink">{pessoaSelecionada.nome}</span>
          </nav>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="eyebrow mb-2">GESTÃO DE PARTICIPANTES</p>
              <h1 className="font-display text-3xl md:text-4xl font-medium text-ink">
                {pessoaSelecionada.nome}
              </h1>
              {pessoaSelecionada.descricao && (
                <p className="text-ink-soft mt-2 text-sm max-w-xl">{pessoaSelecionada.descricao}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => copiarCodigo(pessoaSelecionada.codigo)} className="btn-line">
                {codigoCopiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar Código</>}
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}?codigo=${pessoaSelecionada.codigo}`
                  navigator.clipboard.writeText(url)
                  alert('Link de resgate copiado')
                }}
                className="btn-line"
              >
                <Mail className="w-3.5 h-3.5" /> Compartilhar
              </button>
            </div>
          </div>
        </header>

        {/* LAYOUT: FORM UPLOAD + GALERIA (esq) | SIDEBAR (dir) */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* COLUNA ESQUERDA */}
          <div className="space-y-12">
            {/* UPLOAD */}
            <section>
              <header className="flex items-baseline justify-between mb-5">
                <div>
                  <p className="eyebrow mb-1">ADICIONAR</p>
                  <h2 className="font-display text-2xl font-medium text-ink">Novas fotos</h2>
                </div>
                {arquivos.length > 0 && (
                  <span className="badge badge-amber">
                    {arquivos.length} {arquivos.length === 1 ? 'ARQUIVO' : 'ARQUIVOS'} NA FILA
                  </span>
                )}
              </header>

              <form onSubmit={handleUploadFoto} className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="dropzone"
                >
                  {previewsUrls.length > 0 ? (
                    <div>
                      <div className="text-sm text-ink-soft mb-4 flex items-center justify-between">
                        <span>{arquivos.length} {arquivos.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}</span>
                        <span className="eyebrow">Clique para trocar</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                        {previewsUrls.map((url, idx) => (
                          <div key={idx} className="aspect-square overflow-hidden">
                            <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <FolderUp className="w-10 h-10 text-amber mx-auto mb-3" strokeWidth={1.4} />
                      <p className="dropzone-label">Arraste e solte fotos aqui</p>
                      <p className="dropzone-hint">RAW, JPEG ou TIFF — várias de uma vez</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef} type="file" accept="image/*" multiple
                    onChange={(e) => handleFiles(e.target.files)} className="hidden"
                  />
                </div>

                <p className="text-xs text-ink-soft flex items-center gap-2 flex-wrap">
                  <span>
                    <kbd className="font-mono px-1.5 py-0.5 border border-rule text-xs">Ctrl+clique</kbd>
                    {' '}para várias fotos
                  </span>
                  <span>·</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDiretorio() }} className="btn-link text-xs">
                    ou selecione uma pasta inteira
                  </button>
                </p>

                {arquivos.length <= 1 && (
                  <FormField label="Título">
                    <input
                      type="text" value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder={gerarProximoTitulo()}
                      className="input-editorial"
                    />
                  </FormField>
                )}

                {arquivos.length > 1 && (
                  <p className="text-sm text-ink-soft">
                    Títulos automáticos:{' '}
                    <em className="italic text-amber">
                      {normalizarNome(pessoaSelecionada.nome)}_
                      {(fotosPessoa.length + 1).toString().padStart(3, '0')}
                      {' '}até{' '}
                      _{(fotosPessoa.length + arquivos.length).toString().padStart(3, '0')}
                    </em>
                  </p>
                )}

                <FormField label="Descrição (opcional, aplica a todas)">
                  <input
                    type="text" value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição das fotos…"
                    className="input-editorial"
                  />
                </FormField>

                <button
                  type="submit" disabled={uploading || arquivos.length === 0}
                  className="btn-ink disabled:opacity-40"
                >
                  <Upload className="w-4 h-4" />
                  {uploading
                    ? `Enviando ${progressoUpload.atual}/${progressoUpload.total}…`
                    : arquivos.length > 1
                      ? `Enviar e Processar ${arquivos.length} Fotos`
                      : 'Enviar e Processar Foto'}
                </button>
              </form>
            </section>

            {/* GALERIA */}
            <section>
              <header className="flex items-baseline justify-between mb-5 rule-bottom pb-3">
                <div>
                  <p className="eyebrow mb-1">ÁLBUM</p>
                  <h2 className="font-display text-2xl font-medium text-ink">Fotos atribuídas</h2>
                </div>
                <span className="text-sm text-ink-soft">
                  {fotosPessoa.length} {fotosPessoa.length === 1 ? 'foto' : 'fotos'}
                </span>
              </header>

              {fotosPessoa.length === 0 ? (
                <p className="py-16 text-center text-ink-soft">
                  Nenhuma foto ainda. Adicione a primeira acima.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {fotosPessoa.map((foto, idx) => (
                    <div key={foto.id} className="photo-cell group">
                      <div className="relative">
                        <img src={foto.url} alt={foto.titulo} className="photo-cell-image" />
                        <span className="photo-cell-badge">
                          #{String(idx + 1).padStart(3, '0')}
                        </span>
                        {foto.vendida && (
                          <span className="photo-cell-sold">Vendida</span>
                        )}
                        <button
                          onClick={() => deletarFoto(foto)}
                          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-canvas/85 backdrop-blur-sm border border-crimson/50 text-crimson rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Deletar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="photo-cell-meta">
                        <span className="photo-cell-meta-title truncate">{foto.titulo}</span>
                        {!foto.vendida && (
                          <span className="photo-cell-meta-price">
                            {pessoaSelecionada.preco_por_foto.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* SIDEBAR DIREITA — cards de info */}
          <aside className="space-y-4">
            <SidebarCard titulo="Participante Cadastrado" eyebrow="DADOS DA PESSOA">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber to-amber-deep text-canvas text-sm font-bold flex items-center justify-center">
                  {pessoaSelecionada.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base font-medium text-ink truncate">
                    {pessoaSelecionada.nome}
                  </p>
                  {pessoaSelecionada.turma && (
                    <span className="badge badge-muted text-[10px]">{pessoaSelecionada.turma}</span>
                  )}
                </div>
              </div>
              <button
                onClick={abrirEdicao}
                className="btn-line w-full !justify-center text-sm mt-3"
              >
                <Edit className="w-3.5 h-3.5" />
                Editar cadastro
              </button>
            </SidebarCard>

            <SidebarCard titulo="Código Direto" eyebrow="RESGATE">
              <code className="block font-mono text-2xl tracking-[0.15em] text-amber text-center py-3 bg-canvas rounded border border-rule">
                {pessoaSelecionada.codigo}
              </code>
              <button
                onClick={() => copiarCodigo(pessoaSelecionada.codigo)}
                className="btn-line w-full !justify-center text-sm mt-3"
              >
                {codigoCopiado ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar Código</>}
              </button>
            </SidebarCard>

            <SidebarCard titulo="Estatísticas" eyebrow="MÉTRICAS">
              <div className="grid grid-cols-2 gap-3">
                <div className="card !p-3 !bg-surface-2">
                  <p className="eyebrow mb-1">TOTAL DE FOTOS</p>
                  <p className="font-display text-2xl text-amber">{fotosPessoa.length}</p>
                </div>
                <div className="card !p-3 !bg-surface-2">
                  <p className="eyebrow mb-1">PREÇO</p>
                  <p className="font-display text-2xl text-amber">
                    {pessoaSelecionada.preco_por_foto.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            </SidebarCard>

            <SidebarCard eyebrow="INTENÇÃO DE COMPRA" comSparkle>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-active">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-dot" />
                  ATIVO
                </span>
              </div>
              <p className="text-sm text-ink-soft leading-relaxed">
                {fotosPessoa.some(f => f.vendida)
                  ? 'Cliente já comprou fotos desta sessão.'
                  : 'Aguardando primeira interação do cliente na galeria.'}
              </p>
            </SidebarCard>

            <SidebarCard titulo="Notificar Participante" eyebrow="WHATSAPP & EMAIL">
              <div className="space-y-2">
                {pessoaSelecionada.telefone ? (
                  <a
                    href={gerarLinkNotificacaoFotos({
                      nome: pessoaSelecionada.nome,
                      codigo: pessoaSelecionada.codigo,
                      urlBase: typeof window !== 'undefined' ? window.location.origin : '',
                      telefone: pessoaSelecionada.telefone,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-whatsapp w-full !justify-center"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Notificar por WhatsApp
                  </a>
                ) : (
                  <button
                    disabled
                    title="Cadastre o telefone do participante para enviar a notificação"
                    className="btn-whatsapp w-full !justify-center opacity-50 cursor-not-allowed"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Notificar por WhatsApp
                  </button>
                )}
                <button className="btn-line w-full !justify-center text-sm">
                  <Mail className="w-3.5 h-3.5" />
                  Enviar E-mail
                </button>
              </div>
            </SidebarCard>
          </aside>
        </div>
      </main>
    </div>
  )
}

/* ---------------- Subcomponentes ---------------- */

function SidebarItem({
  icon: Icon, label, active, onClick, badge,
}: {
  icon: React.ElementType
  label: string
  active?: boolean
  onClick?: () => void
  badge?: number
}) {
  return (
    <button onClick={onClick} className={`sidebar-item ${active ? 'is-active' : ''}`}>
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className="badge badge-amber text-[10px]">{badge}</span>
      )}
    </button>
  )
}

function FormField({
  label, htmlFor, children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block eyebrow mb-2">{label}</label>
      {children}
    </div>
  )
}

function ModalSheet({
  children, onClose, size = 'md',
}: {
  children: React.ReactNode
  onClose: () => void
  size?: 'md' | 'lg'
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-sheet ${size === 'lg' ? 'modal-sheet-lg' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-sheet-body">{children}</div>
      </div>
    </div>
  )
}

function SidebarCard({
  titulo, eyebrow, children, comSparkle,
}: {
  titulo?: string
  eyebrow: string
  children: React.ReactNode
  comSparkle?: boolean
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <p className="eyebrow">{eyebrow}</p>
        {comSparkle && <Sparkles className="w-3 h-3 text-amber" />}
      </div>
      {titulo && (
        <p className="font-display text-base font-medium text-ink mb-3">{titulo}</p>
      )}
      {children}
    </div>
  )
}

function EmptyStateNova({ onClick }: { onClick: () => void }) {
  return (
    <div className="card !p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center mx-auto mb-4">
        <Plus className="w-7 h-7 text-amber" />
      </div>
      <p className="font-display text-2xl text-ink mb-2">Nenhuma pessoa ainda</p>
      <p className="text-ink-soft text-sm mb-6 max-w-md mx-auto">
        Comece cadastrando a primeira pessoa. Um código único será gerado
        automaticamente para que ela resgate as fotos pela galeria.
      </p>
      <button onClick={onClick} className="btn-amber-pill">
        Cadastrar primeira pessoa
      </button>
    </div>
  )
}
