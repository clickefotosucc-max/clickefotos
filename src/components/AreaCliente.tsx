'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Pessoa } from '@/types'
import { gerarPixCopiaCola } from '@/lib/pix'
import { gerarLinkWhatsApp } from '@/lib/whatsapp'
import QRCodeSVG from '@/components/QRCodeSVG'
import Header from '@/components/Header'
import {
  Download, Check, X, Plus, Copy, ArrowRight, Sparkles,
  Clock, Camera, ChevronRight, Tag,
} from 'lucide-react'

interface Props {
  pessoa: Pessoa
  fotos: Foto[]
  onVoltar: () => void
}

type CheckoutStep = 'dados' | 'pix' | 'pago'

export default function AreaCliente({ pessoa, fotos: fotosIniciais, onVoltar }: Props) {
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciais)
  const [carrinho, setCarrinho] = useState<string[]>([])
  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [step, setStep] = useState<CheckoutStep>('dados')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [pixCopiaCola, setPixCopiaCola] = useState('')
  const [pixTotal, setPixTotal] = useState(0)
  const [pixTxId, setPixTxId] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [comprando, setComprando] = useState(false)

  // contador PIX fake (10 min) — UX visual apenas
  const [pixExpiraEm, setPixExpiraEm] = useState<number | null>(null)

  const [fotoSelecionada, setFotoSelecionada] = useState<Foto | null>(null)

  const fotosNoCarrinho = fotos.filter(f => carrinho.includes(f.id))
  const totalCarrinho = fotosNoCarrinho.reduce((acc, f) => acc + pessoa.preco_por_foto, 0)
  const economiaPacote = totalCarrinho * 0.2 // 20% off no pacote (visual)

  function toggleCarrinho(fotoId: string) {
    setCarrinho(prev =>
      prev.includes(fotoId)
        ? prev.filter(id => id !== fotoId)
        : [...prev, fotoId]
    )
  }

  function limparCarrinho() { setCarrinho([]) }

  useEffect(() => {
    function bloquearContexto(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') e.preventDefault()
    }
    document.addEventListener('contextmenu', bloquearContexto)
    return () => document.removeEventListener('contextmenu', bloquearContexto)
  }, [])

  // Contador regressivo do PIX
  useEffect(() => {
    if (step !== 'pix' || pixExpiraEm === null) return
    const t = setInterval(() => {
      setPixExpiraEm(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [step, pixExpiraEm])

  async function gerarPagamentoPix() {
    if (!email || !nome) {
      alert('Preencha nome e email')
      return
    }
    setComprando(true)

    const configSalva = localStorage.getItem('clickefotos-config')
    let chavePix = 'clickefotos@exemplo.com'
    let whatsappDestino = ''
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva)
        if (config.chavePix) chavePix = config.chavePix
        if (config.whatsapp) whatsappDestino = config.whatsapp
      } catch {}
    }

    const txid = `CLI${Date.now().toString().slice(-8)}`

    const codigoPix = gerarPixCopiaCola({
      chave: chavePix,
      valor: totalCarrinho,
      nomeRecebedor: 'CLICKEFOTOS',
      cidade: 'SAO PAULO',
      txid,
      descricao: `Compra de ${carrinho.length} foto(s)`,
    })

    setPixCopiaCola(codigoPix)
    setPixTotal(totalCarrinho)
    setPixTxId(txid)
    setPixExpiraEm(600) // 10 min
    setStep('pix')
    setComprando(false)

    if (whatsappDestino) {
      const compras = carrinho.map(fotoId => ({
        foto_id: fotoId,
        cliente_email: email,
        cliente_nome: nome,
        valor_pago: totalCarrinho / carrinho.length,
        status: 'pendente',
        download_token: txid,
      }))
      await supabase.from('compras').insert(compras)
    }
  }

  async function confirmarPagamento() {
    setComprando(true)

    await supabase
      .from('compras')
      .update({ status: 'pago' })
      .eq('download_token', pixTxId)
      .eq('status', 'pendente')

    await supabase
      .from('fotos')
      .update({ vendida: true })
      .in('id', carrinho)

    setFotos(fotos.map(f =>
      carrinho.includes(f.id) ? { ...f, vendida: true } : f
    ))

    setStep('pago')
    setCarrinho([])
    setComprando(false)
  }

  function copiarPix() {
    navigator.clipboard.writeText(pixCopiaCola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function fecharCheckout() {
    setMostrarCheckout(false)
    setStep('dados')
    setPixCopiaCola('')
    setPixExpiraEm(null)
  }

  function formatExpira(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const ss = (s % 60).toString().padStart(2, '0')
    return `${m}:${ss}`
  }

  const navItems = [
    { label: 'Resgatar Fotos' },
    { label: 'Minha Galeria', active: true },
    { label: 'Painel do Fotógrafo' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        variant="cliente"
        onVoltar={onVoltar}
        navItems={navItems}
        carrinhoCount={carrinho.length}
        onAbrirCarrinho={() => setMostrarCheckout(true)}
        badgeEvento={`Sessão de ${pessoa.nome.split(' ')[0]}`}
      />

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-10 pb-32">
        {/* HERO */}
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-start mb-12 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-amber">
                <Camera className="w-3 h-3" />
                SESSÃO ESCOLAR OFICIAL 2025
              </span>
              {pessoa.turma && (
                <span className="hidden sm:inline badge badge-muted">
                  TURMA {pessoa.turma}
                </span>
              )}
            </div>
            <h1 className="font-display text-[2.25rem] sm:text-5xl lg:text-6xl font-medium leading-[1.05] tracking-tight mb-4 text-ink">
              Olá, <em className="italic text-amber">{pessoa.nome.split(' ')[0]}</em>.
              <br />
              <span className="text-ink-soft text-[0.7em] font-normal">
                {fotos.length} {fotos.length === 1 ? 'foto encontrada' : 'fotos encontradas'} na sua galeria.
              </span>
            </h1>
            {pessoa.descricao && (
              <p className="text-base text-ink-soft leading-relaxed max-w-xl">
                {pessoa.descricao}
              </p>
            )}
          </div>

          {/* Oferta pacote — visual referência */}
          <div className="card !bg-gradient-to-br !from-amber/10 !via-surface-1 !to-surface-1 !border-amber/30 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber/15 rounded-full blur-3xl" />
            <div className="relative">
              <span className="badge badge-amber mb-3">
                <Sparkles className="w-3 h-3" />
                PACOTE COMPLETO
              </span>
              <h3 className="font-display text-2xl font-medium text-ink mb-2">
                Economize <em className="italic text-amber">20%</em> no pacote.
              </h3>
              <p className="text-sm text-ink-soft mb-4 leading-relaxed">
                Todas as suas fotos em alta resolução por um valor único.
              </p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xs text-ink-muted line-through">
                  R$ {(totalCarrinho + economiaPacote).toFixed(2).replace('.', ',')}
                </span>
                <span className="font-display text-3xl text-amber font-medium">
                  R$ {(totalCarrinho * 0.8).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <button className="btn-line w-full !justify-center text-sm" disabled>
                Disponível no checkout
              </button>
            </div>
          </div>
        </section>

        {/* GALERIA */}
        {fotos.length === 0 ? (
          <div className="text-center py-24 card">
            <div className="text-7xl mb-4 opacity-50">📷</div>
            <h3 className="font-display text-xl font-medium text-ink mb-2">
              Nenhuma foto ainda
            </h3>
            <p className="text-ink-soft">
              Suas fotos aparecerão aqui em breve.
            </p>
          </div>
        ) : (
          <section>
            <div className="flex items-baseline justify-between mb-6 rule pb-4">
              <div>
                <p className="eyebrow mb-1">SUAS FOTOS</p>
                <h2 className="font-display text-2xl font-medium text-ink">
                  Galeria Pessoal
                </h2>
              </div>
              <span className="hidden md:flex items-center gap-2 text-xs text-ink-soft">
                <Clock className="w-3.5 h-3.5" />
                Capturadas em {new Date(fotos[0]?.created_at || Date.now()).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {fotos.map((foto, idx) => {
                const noCarrinho = carrinho.includes(foto.id)
                return (
                  <article
                    key={foto.id}
                    className={`photo-cell group ${noCarrinho ? 'selected' : ''}`}
                  >
                    <div
                      className="relative cursor-pointer"
                      onClick={() => setFotoSelecionada(foto)}
                    >
                      <img
                        src={foto.url}
                        alt={foto.titulo}
                        className="photo-cell-image pointer-events-none select-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      <span className="photo-cell-badge">
                        RETRATO #{String(idx + 1).padStart(3, '0')}
                      </span>
                      {foto.vendida && (
                        <span className="photo-cell-sold">Comprada</span>
                      )}
                      {!foto.vendida && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCarrinho(foto.id)
                          }}
                          className={`photo-cell-check ${noCarrinho ? 'is-on' : ''}`}
                          aria-label={noCarrinho ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
                        >
                          {noCarrinho ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
                        </button>
                      )}
                    </div>
                    <div className="photo-cell-meta">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <Tag className="w-3 h-3 text-amber shrink-0" />
                        <span className="photo-cell-meta-title truncate">
                          {foto.titulo}
                        </span>
                      </div>
                      {!foto.vendida && (
                        <span className="photo-cell-meta-price">
                          R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* DOCK INFERIOR — carrinho sempre acessível */}
      {carrinho.length > 0 && (
        <div className="dock-selecao animate-fade-up">
          <div className="flex items-center gap-3 pr-3">
            <span className="w-7 h-7 rounded-full bg-amber text-canvas text-xs font-bold flex items-center justify-center">
              {carrinho.length}
            </span>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.15em] text-ink-soft font-semibold">
                {carrinho.length === 1 ? '1 foto selecionada' : `${carrinho.length} fotos selecionadas`}
              </p>
              <p className="font-display text-lg text-ink leading-none">
                R$ {totalCarrinho.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMostrarCheckout(true)}
            className="btn-amber-pill"
          >
            Avançar para o Checkout PIX
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL CHECKOUT — duas colunas em desktop */}
      {mostrarCheckout && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (step === 'pix') return
            fecharCheckout()
          }}
        >
          <div
            className="modal-sheet modal-sheet-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-sheet-body !p-0">
              <div className="grid lg:grid-cols-[1.2fr_1fr]">
                {/* COLUNA ESQUERDA — lista + dados */}
                <div className="p-8 border-b lg:border-b-0 lg:border-r border-rule">
                  <header className="flex items-start justify-between mb-6">
                    <div>
                      <p className="eyebrow mb-1">CHECKOUT</p>
                      <h3 className="font-display text-2xl font-medium text-ink">
                        {step === 'dados' && 'Finalizar seleção'}
                        {step === 'pix' && 'Pagamento via PIX'}
                        {step === 'pago' && 'Pagamento confirmado'}
                      </h3>
                    </div>
                    {step !== 'pix' && (
                      <button onClick={fecharCheckout} className="btn-ghost-editorial !p-2">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </header>

                  {step === 'dados' && (
                    <>
                      {carrinho.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="font-display text-xl mb-2 text-ink">Carrinho vazio</p>
                          <p className="text-ink-soft text-sm">
                            Adicione fotos clicando no + sobre cada foto.
                          </p>
                        </div>
                      ) : (
                        <>
                          <ul className="space-y-2 mb-6">
                            {fotosNoCarrinho.map(foto => (
                              <li key={foto.id} className="flex items-center gap-3 py-2 border-b border-rule last:border-0">
                                <img src={foto.url} className="w-12 h-12 object-cover" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-display text-sm text-ink truncate">{foto.titulo}</p>
                                  <p className="text-xs text-ink-soft">
                                    R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')}
                                  </p>
                                </div>
                                <button
                                  onClick={() => toggleCarrinho(foto.id)}
                                  className="text-ink-soft hover:text-crimson transition-colors p-1"
                                  aria-label="Remover"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </li>
                            ))}
                          </ul>

                          <div className="space-y-3 mb-6 text-sm">
                            <div className="flex justify-between text-ink-soft">
                              <span>Subtotal</span>
                              <span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="flex justify-between text-amber font-medium">
                              <span>Pacote completo (−20%)</span>
                              <span>− R$ {economiaPacote.toFixed(2).replace('.', ',')}</span>
                            </div>
                          </div>

                          <div className="rule pt-4 mb-6 flex justify-between items-baseline">
                            <span className="eyebrow">TOTAL</span>
                            <span className="font-display text-3xl text-amber font-medium">
                              R$ {(totalCarrinho * 0.8).toFixed(2).replace('.', ',')}
                            </span>
                          </div>

                          <div className="space-y-5">
                            <div>
                              <label className="block eyebrow mb-2">SEU NOME</label>
                              <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Como devemos chamar você"
                                className="input-editorial"
                              />
                            </div>
                            <div>
                              <label className="block eyebrow mb-2">SEU EMAIL</label>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="input-editorial"
                              />
                              <p className="text-xs text-ink-soft mt-2">
                                Usado para identificar a compra.
                              </p>
                            </div>

                            <button
                              onClick={gerarPagamentoPix}
                              disabled={comprando || !email || !nome || carrinho.length === 0}
                              className="btn-amber-pill w-full !justify-center !py-3.5"
                            >
                              {comprando ? 'Gerando…' : 'Gerar PIX para pagamento'}
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {step === 'pix' && (
                    <>
                      <p className="text-ink-soft text-sm mb-6 leading-relaxed">
                        Após pagar, envie o comprovante pelo WhatsApp. Assim que
                        confirmarmos, suas fotos ficam liberadas.
                      </p>

                      <a
                        href={(() => {
                          const configSalva = localStorage.getItem('clickefotos-config')
                          let whatsappDestino = '5511999999999'
                          if (configSalva) {
                            try {
                              const config = JSON.parse(configSalva)
                              if (config.whatsapp) whatsappDestino = config.whatsapp
                            } catch {}
                          }
                          return gerarLinkWhatsApp({
                            nome,
                            email,
                            pessoa: pessoa.nome,
                            codigo: pessoa.codigo,
                            quantidade: fotosNoCarrinho.length,
                            valor: pixTotal,
                            pixCopiaCola,
                            whatsappDestino,
                          })
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-whatsapp w-full mb-4"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        Enviar comprovante por WhatsApp
                      </a>

                      <details className="text-xs text-ink-soft">
                        <summary className="cursor-pointer hover:text-ink py-2">
                          Já enviei o comprovante
                        </summary>
                        <div className="mt-3">
                          <button
                            onClick={confirmarPagamento}
                            disabled={comprando}
                            className="btn-line w-full disabled:opacity-40"
                          >
                            {comprando ? 'Liberando…' : 'Liberar fotos manualmente'}
                          </button>
                          <p className="text-xs text-ink-soft mt-2 text-center">
                            Use só após confirmar pelo WhatsApp.
                          </p>
                        </div>
                      </details>

                      <button
                        onClick={() => { setStep('dados'); setPixCopiaCola(''); setPixExpiraEm(null) }}
                        className="mt-6 btn-link flex items-center gap-1"
                      >
                        ← Voltar
                      </button>
                    </>
                  )}

                  {step === 'pago' && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-amber/15 border border-amber/40 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-7 h-7 text-amber" strokeWidth={3} />
                      </div>
                      <p className="eyebrow mb-2 text-amber">CONFIRMADO</p>
                      <h4 className="font-display text-2xl font-medium text-ink mb-2">
                        Pagamento recebido.
                      </h4>
                      <p className="text-ink-soft text-sm mb-6">
                        Suas fotos estão liberadas para download.
                      </p>

                      <ul className="space-y-2 mb-6 text-left">
                        {fotos.filter(f => f.vendida).slice(-10).map(foto => (
                          <li key={foto.id} className="flex items-center gap-3 py-2 border-b border-rule last:border-0">
                            <img src={foto.url} className="w-10 h-10 object-cover" />
                            <span className="font-display text-sm text-ink flex-1 truncate">{foto.titulo}</span>
                            <a
                              href={foto.url_hd}
                              download={`clickefotos-${foto.titulo}.jpg`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-link text-xs flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Baixar
                            </a>
                          </li>
                        ))}
                      </ul>

                      <button onClick={fecharCheckout} className="btn-amber-pill w-full !justify-center">
                        Fechar
                      </button>
                    </div>
                  )}
                </div>

                {/* COLUNA DIREITA — PIX */}
                <div className="p-8 bg-surface-2 lg:bg-surface-2 flex flex-col justify-center">
                  {step === 'dados' && (
                    <div className="text-center">
                      <span className="badge badge-amber mb-4">PAGAMENTO SEGURO</span>
                      <h4 className="font-display text-xl font-medium text-ink mb-2">
                        Pague via PIX
                      </h4>
                      <p className="text-sm text-ink-soft mb-6">
                        Aprovação imediata. QR Code gerado na próxima etapa.
                      </p>
                      <div className="space-y-2 text-xs text-ink-soft">
                        <div className="flex justify-between"><span>Velocidade</span><span className="text-ink">Imediata</span></div>
                        <div className="flex justify-between"><span>Taxa</span><span className="text-ink">Sem custos</span></div>
                        <div className="flex justify-between"><span>Comprovante</span><span className="text-ink">Automático</span></div>
                      </div>
                    </div>
                  )}

                  {(step === 'pix' || step === 'pago') && (
                    <>
                      <div className="text-center mb-5">
                        <p className="eyebrow mb-1">VALOR A PAGAR</p>
                        <p className="font-display text-4xl text-amber font-medium">
                          R$ {pixTotal.toFixed(2).replace('.', ',')}
                        </p>
                        {step === 'pix' && pixExpiraEm !== null && (
                          <p className="text-xs text-ink-soft mt-2 flex items-center justify-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            PIX expira em {formatExpira(pixExpiraEm)}
                          </p>
                        )}
                      </div>

                      {step === 'pix' && (
                        <>
                          <div className="qr-box mx-auto mb-4">
                            <QRCodeSVG value={pixCopiaCola} size={224} />
                          </div>
                          <p className="text-xs text-ink-soft text-center mb-4">
                            Escaneie com o app do seu banco
                          </p>

                          <div className="mb-4">
                            <label className="block eyebrow mb-2">CÓDIGO COPIA-E-COLA</label>
                            <div className="flex gap-2 items-end">
                              <input
                                type="text"
                                value={pixCopiaCola}
                                readOnly
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                className="input-editorial font-mono !text-xs !py-2"
                              />
                              <button onClick={copiarPix} className="btn-line !px-3 shrink-0 !py-2">
                                {copiado ? <><Check className="w-3.5 h-3.5" /></> : <><Copy className="w-3.5 h-3.5" /></>}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {step === 'pago' && (
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-amber/15 border border-amber/40 flex items-center justify-center mx-auto">
                            <Check className="w-7 h-7 text-amber" strokeWidth={3} />
                          </div>
                          <p className="text-ink-soft text-sm mt-3">Liberação concluída</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {fotoSelecionada && !mostrarCheckout && (
        <div
          className="modal-backdrop"
          onClick={() => setFotoSelecionada(null)}
        >
          <div
            className="modal-sheet modal-sheet-lg !max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-surface-2 select-none">
              <img
                src={fotoSelecionada.url}
                alt={fotoSelecionada.titulo}
                className="w-full max-h-[70vh] object-contain pointer-events-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              <button
                onClick={() => setFotoSelecionada(null)}
                className="absolute top-3 right-3 w-9 h-9 bg-surface-1 border border-rule rounded-full flex items-center justify-center hover:border-amber transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-sheet-body">
              <p className="eyebrow mb-2">{fotoSelecionada.titulo}</p>
              {fotoSelecionada.descricao && (
                <p className="text-ink-soft mb-6">{fotoSelecionada.descricao}</p>
              )}
              {fotoSelecionada.vendida ? (
                <a
                  href={fotoSelecionada.url_hd}
                  download={`clickefotos-${fotoSelecionada.titulo}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-amber-pill w-full !justify-center"
                >
                  <Download className="w-4 h-4" />
                  Baixar HD
                </a>
              ) : !carrinho.includes(fotoSelecionada.id) ? (
                <button
                  onClick={() => toggleCarrinho(fotoSelecionada.id)}
                  className="btn-amber-pill w-full !justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar · R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')}
                </button>
              ) : (
                <button
                  onClick={() => toggleCarrinho(fotoSelecionada.id)}
                  className="btn-line w-full"
                >
                  <Check className="w-4 h-4" />
                  No carrinho — remover
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
