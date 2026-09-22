'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Pessoa } from '@/types'
import { gerarPixCopiaCola } from '@/lib/pix'
import { gerarLinkWhatsApp } from '@/lib/whatsapp'
import QRCodeSVG from '@/components/QRCodeSVG'
import { ArrowLeft, Download, Lock, Check, X, ShoppingCart, Plus, Minus, Copy, QrCode } from 'lucide-react'

interface Props {
  pessoa: Pessoa
  fotos: Foto[]
  onVoltar: () => void
}

export default function AreaCliente({ pessoa, fotos: fotosIniciais, onVoltar }: Props) {
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciais)
  const [carrinho, setCarrinho] = useState<string[]>([]) // IDs das fotos no carrinho
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false)
  const [comprando, setComprando] = useState(false)
  const [step, setStep] = useState<'ver' | 'comprar' | 'pago' | 'baixar'>('ver')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [pixCopiaCola, setPixCopiaCola] = useState('')
  const [pixTotal, setPixTotal] = useState(0)
  const [pixTxId, setPixTxId] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [downloadsUsados, setDownloadsUsados] = useState(0)

  const fotosNoCarrinho = fotos.filter(f => carrinho.includes(f.id))
  const totalCarrinho = fotosNoCarrinho.reduce((acc, f) => acc + pessoa.preco_por_foto, 0)

  function toggleCarrinho(fotoId: string) {
    setCarrinho(prev =>
      prev.includes(fotoId)
        ? prev.filter(id => id !== fotoId)
        : [...prev, fotoId]
    )
  }

  function limparCarrinho() {
    setCarrinho([])
  }

  useEffect(() => {
    function bloquearContexto(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', bloquearContexto)
    return () => document.removeEventListener('contextmenu', bloquearContexto)
  }, [])

  async function iniciarCompra() {
    if (carrinho.length === 0) {
      alert('Adicione pelo menos uma foto ao carrinho')
      return
    }
    setStep('comprar')
  }

  async function gerarPagamentoPix() {
    if (!email || !nome) {
      alert('Preencha nome e email')
      return
    }

    setComprando(true)

    const total = totalCarrinho

    // Lê chave PIX e WhatsApp do localStorage (configurada pelo admin)
    const configSalva = localStorage.getItem('clickefotos-config')
    let chavePix = 'clickefotos@exemplo.com' // fallback se não configurado
    let whatsappDestino = ''
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva)
        if (config.chavePix) chavePix = config.chavePix
        if (config.whatsapp) whatsappDestino = config.whatsapp
      } catch {}
    }

    const txid = `CLI${Date.now().toString().slice(-8)}`

    // Gera código PIX
    const codigoPix = gerarPixCopiaCola({
      chave: chavePix,
      valor: total,
      nomeRecebedor: 'CLICKEFOTOS',
      cidade: 'SAO PAULO',
      txid,
      descricao: `Compra de ${carrinho.length} foto(s)`,
    })

    setPixCopiaCola(codigoPix)
    setPixTotal(total)
    setPixTxId(txid)
    setStep('pix')
    setComprando(false)

    // Salva a compra como pendente pra admin poder liberar depois
    if (whatsappDestino) {
      const compras = carrinho.map(fotoId => ({
        foto_id: fotoId,
        cliente_email: email,
        cliente_nome: nome,
        valor_pago: total / carrinho.length,
        status: 'pendente',
        download_token: txid,
      }))
      await supabase.from('compras').insert(compras)
    }
  }

  async function confirmarPagamento() {
    setComprando(true)

    // Marca as compras pendentes como pagas (criadas quando gerou PIX)
    await supabase
      .from('compras')
      .update({ status: 'pago' })
      .eq('download_token', pixTxId)
      .eq('status', 'pendente')

    // Atualiza status das fotos
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

  async function baixarHD() {
    if (!fotoSelecionada) return
    if (downloadsUsados >= 3) {
      alert('Limite de downloads atingido')
      return
    }

    setDownloadsUsados(downloadsUsados + 1)
    setStep('baixar')

    const link = document.createElement('a')
    link.href = fotoSelecionada.url_hd
    link.download = `clickefotos-${fotoSelecionada.titulo}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen text-white">
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onVoltar}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Sair
          </button>
          <div className="text-center flex-1">
            <h2 className="font-bold text-lg">{pessoa.nome}</h2>
            <p className="text-xs text-white/50">
              Código: <span className="font-mono font-semibold">{pessoa.codigo}</span>
              {pessoa.turma && ` • ${pessoa.turma}`}
            </p>
          </div>
          <button
            onClick={() => setMostrarCarrinho(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold"
          >
            <ShoppingCart className="w-4 h-4" />
            {carrinho.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center">
                {carrinho.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <section className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} encontradas
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            Olá, <span className="gradient-text">{pessoa.nome}</span>
          </h1>
          {pessoa.descricao && (
            <p className="text-white/60 max-w-xl mx-auto">{pessoa.descricao}</p>
          )}
        </section>

        {fotos.length === 0 ? (
          <div className="text-center py-24 glass-strong rounded-3xl">
            <div className="text-7xl mb-4 opacity-50">📷</div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma foto ainda</h3>
            <p className="text-white/50">
              Suas fotos aparecerão aqui em breve.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((foto, idx) => {
              const noCarrinho = carrinho.includes(foto.id)
              return (
              <article
                key={foto.id}
                className={`photo-card glass-strong rounded-3xl overflow-hidden animate-fade-up transition-all ${noCarrinho ? 'ring-2 ring-violet-500' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black/20 group cursor-pointer"
                  onClick={() => setFotoSelecionada(foto)}>
                  <img
                    src={foto.url}
                    alt={foto.titulo}
                    className="photo-image w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {foto.vendida && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/90 text-white">
                      ✓ Comprada
                    </div>
                  )}
                  {!foto.vendida && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCarrinho(foto.id)
                      }}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${noCarrinho ? 'bg-violet-500 text-white' : 'bg-black/40 text-white/70 hover:bg-black/60'}`}
                    >
                      {noCarrinho ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>

                <div className="p-5">
                  <h4 className="font-bold text-lg leading-tight line-clamp-1">
                    {foto.titulo}
                  </h4>
                  {foto.descricao && (
                    <p className="text-sm text-white/60 mt-2 line-clamp-2">
                      {foto.descricao}
                    </p>
                  )}

                  <div className="mt-5 pt-4 border-t border-white/5">
                    {foto.vendida ? (
                      <button
                        onClick={() => {
                          setFotoSelecionada(foto)
                          setStep('baixar')
                        }}
                        className="w-full py-2.5 rounded-xl glass hover:bg-white/[0.08] font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar novamente
                      </button>
                    ) : noCarrinho ? (
                      <button
                        onClick={() => toggleCarrinho(foto.id)}
                        className="w-full py-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        No carrinho • R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')}
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleCarrinho(foto.id)}
                        className="w-full py-2.5 rounded-xl glass hover:bg-white/[0.08] font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar ao carrinho
                      </button>
                    )}
                  </div>
                </div>
              </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal do Carrinho + Pagamento */}
      {mostrarCarrinho && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up"
          onClick={() => {
            if (step === 'pix') return // não fecha enquanto espera pagamento
            setMostrarCarrinho(false)
            setStep('ver')
          }}
        >
          <div
            className="glass-strong rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {step === 'ver' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Seu carrinho
                    </h3>
                    <button onClick={() => setMostrarCarrinho(false)} className="w-8 h-8 rounded-full glass flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {fotosNoCarrinho.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-3 opacity-50">🛒</div>
                      <p className="text-white/60">Carrinho vazio</p>
                      <p className="text-xs text-white/40 mt-2">Adicione fotos clicando no + nas fotos</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6">
                        {fotosNoCarrinho.map(foto => (
                          <div key={foto.id} className="flex items-center gap-3 glass rounded-xl p-3">
                            <img src={foto.url} className="w-16 h-16 rounded-lg object-cover" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{foto.titulo}</div>
                              <div className="text-xs text-white/50">R$ {pessoa.preco_por_foto.toFixed(2).replace('.', ',')}</div>
                            </div>
                            <button onClick={() => toggleCarrinho(foto.id)} className="text-red-400 hover:text-red-300">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-white/10 pt-4 mb-6">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total</span>
                          <span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                            Seu nome
                          </label>
                          <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full px-4 py-3 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                            Seu email
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full px-4 py-3 rounded-xl"
                          />
                          <p className="text-xs text-white/40 mt-2">Para receber o link de download</p>
                        </div>

                        <button
                          onClick={gerarPagamentoPix}
                          disabled={comprando || !email || !nome}
                          className="btn-primary w-full py-4 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <QrCode className="w-5 h-5" />
                          {comprando ? 'Gerando...' : `Pagar com PIX • R$ ${totalCarrinho.toFixed(2).replace('.', ',')}`}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {step === 'pix' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-green-400" />
                      Pagar com PIX
                    </h3>
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-3xl font-black gradient-text mb-1">
                      R$ {pixTotal.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="text-sm text-white/60">{fotosNoCarrinho.length} {fotosNoCarrinho.length === 1 ? 'foto' : 'fotos'}</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl mx-auto max-w-xs mb-4">
                    <QRCodeSVG value={pixCopiaCola} size={256} />
                  </div>

                  <p className="text-xs text-white/50 text-center mb-3">
                    Escaneie o QR Code com o app do seu banco
                  </p>

                  <div className="glass rounded-xl p-3 mb-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                      PIX Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pixCopiaCola}
                        readOnly
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        className="flex-1 px-3 py-2 rounded-lg font-mono text-xs"
                      />
                      <button
                        onClick={copiarPix}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 transition-colors"
                      >
                        {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-xs text-green-200/80 mb-4">
                    <strong>📲 Como funciona:</strong> após pagar o PIX, envie o comprovante pelo WhatsApp abaixo.
                    Assim que confirmarmos o pagamento, suas fotos serão liberadas.
                  </div>

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
                    className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 mb-3 bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    Enviar comprovante no WhatsApp
                  </a>

                  <details className="text-xs text-white/50 mb-2">
                    <summary className="cursor-pointer hover:text-white/70">
                      Já paguei e confirmei pelo WhatsApp
                    </summary>
                    <div className="mt-3 space-y-2">
                      <button
                        onClick={confirmarPagamento}
                        disabled={comprando}
                        className="w-full py-2.5 rounded-xl glass hover:bg-white/[0.08] font-semibold text-sm disabled:opacity-50"
                      >
                        {comprando ? 'Liberando...' : 'Clique aqui pra liberar'}
                      </button>
                      <p className="text-xs text-white/40 text-center">
                        (Use isto só após confirmar o pagamento pelo WhatsApp)
                      </p>
                    </div>
                  </details>

                  <button
                    onClick={() => {
                      setStep('ver')
                      setPixCopiaCola('')
                    }}
                    className="w-full py-2.5 rounded-xl text-sm text-white/60 hover:text-white"
                  >
                    Voltar
                  </button>
                  </div>
                </div>
              )}

              {step === 'pago' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <Check className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Pagamento confirmado!</h3>
                  <p className="text-sm text-white/60 mb-6">
                    {carrinho.length === 0 ? `${fotos.filter(f => f.vendida).length}` : carrinho.length} foto(s) liberadas para download
                  </p>

                  <div className="space-y-3 mb-6">
                    {fotos.filter(f => f.vendida).slice(-10).map(foto => (
                      <div key={foto.id} className="flex items-center gap-3 glass rounded-xl p-3 text-left">
                        <img src={foto.url} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{foto.titulo}</div>
                          <div className="text-xs text-green-400">✓ Disponível</div>
                        </div>
                        <a
                          href={foto.url_hd}
                          download={`clickefotos-${foto.titulo}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setMostrarCarrinho(false)
                      setStep('ver')
                    }}
                    className="w-full py-3 rounded-xl glass hover:bg-white/[0.08] font-semibold"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualização de foto (sem compra) */}
      {fotoSelecionada && step !== 'pix' && step !== 'pago' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up"
          onClick={() => setFotoSelecionada(null)}
        >
          <div
            className="glass-strong rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-black/20 select-none">
              <img
                src={fotoSelecionada.url}
                alt={fotoSelecionada.titulo}
                className="w-full max-h-[70vh] object-contain pointer-events-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              <button
                onClick={() => setFotoSelecionada(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full glass-strong flex items-center justify-center hover:bg-white/[0.1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg mb-1">{fotoSelecionada.titulo}</h3>
              {fotoSelecionada.descricao && (
                <p className="text-sm text-white/60">{fotoSelecionada.descricao}</p>
              )}
              {fotoSelecionada.vendida && (
                <a
                  href={fotoSelecionada.url_hd}
                  download={`clickefotos-${fotoSelecionada.titulo}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-4 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar HD
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
