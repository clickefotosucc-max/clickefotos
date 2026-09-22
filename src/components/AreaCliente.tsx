'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Estande } from '@/types'
import { ArrowLeft, Download, Heart, Lock, Check, X } from 'lucide-react'

interface Props {
  estande: Estande
  fotos: Foto[]
  onVoltar: () => void
}

export default function AreaCliente({ estande, fotos: fotosIniciais, onVoltar }: Props) {
  const [fotos, setFotos] = useState<Foto[]>(fotosIniciais)
  const [fotoSelecionada, setFotoSelecionada] = useState<Foto | null>(null)
  const [comprando, setComprando] = useState(false)
  const [step, setStep] = useState<'ver' | 'comprar' | 'pago' | 'baixar'>('ver')
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [tokenDownload, setTokenDownload] = useState<string>('')
  const [downloadsUsados, setDownloadsUsados] = useState(0)

  async function iniciarCompra(foto: Foto) {
    setFotoSelecionada(foto)
    setStep('comprar')
  }

  async function finalizarCompra() {
    if (!fotoSelecionada || !email || !nome) {
      alert('Preencha todos os campos')
      return
    }

    setComprando(true)

    // Em produção: integração com Stripe/MercadoPago aqui
    // Para MVP: simulamos o pagamento aprovado

    const downloadToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`

    const { data, error } = await supabase
      .from('compras')
      .insert([{
        foto_id: fotoSelecionada.id,
        cliente_email: email,
        cliente_nome: nome,
        valor_pago: estande.preco_por_foto,
        status: 'pago',
        download_token: downloadToken,
      }])
      .select()
      .single()

    if (error) {
      alert('Erro ao processar compra: ' + error.message)
      setComprando(false)
      return
    }

    // Marcar foto como vendida
    await supabase
      .from('fotos')
      .update({ vendida: true })
      .eq('id', fotoSelecionada.id)

    setTokenDownload(downloadToken)
    setStep('pago')
    setComprando(false)

    // Atualizar lista
    setFotos(fotos.map(f =>
      f.id === fotoSelecionada.id ? { ...f, vendida: true } : f
    ))
  }

  async function baixarHD() {
    if (!fotoSelecionada) return
    if (downloadsUsados >= 3) {
      alert('Limite de downloads atingido')
      return
    }

    setDownloadsUsados(downloadsUsados + 1)
    setStep('baixar')

    // Trigger download
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
      {/* Header com dados do estande */}
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
            <h2 className="font-bold text-lg">{estande.nome}</h2>
            <p className="text-xs text-white/50">
              Código: <span className="font-mono font-semibold">{estande.codigo}</span>
              {estande.turma && ` • ${estande.turma}`}
            </p>
          </div>
          <div className="w-16"></div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Cabeçalho do estande */}
        <section className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'} encontradas
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3">
            <span className="gradient-text">{estande.nome}</span>
          </h1>
          {estande.descricao && (
            <p className="text-white/60 max-w-xl mx-auto">{estande.descricao}</p>
          )}
          <p className="text-sm text-white/40 mt-4">
            Por <span className="text-white/70 font-semibold">{estande.responsavel}</span>
          </p>
        </section>

        {/* Galeria */}
        {fotos.length === 0 ? (
          <div className="text-center py-24 glass-strong rounded-3xl">
            <div className="text-7xl mb-4 opacity-50">📷</div>
            <h3 className="text-xl font-semibold mb-2">Nenhuma foto ainda</h3>
            <p className="text-white/50">
              As fotos do seu estande aparecerão aqui em breve.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {fotos.map((foto, idx) => (
              <article
                key={foto.id}
                className="photo-card glass-strong rounded-3xl overflow-hidden animate-fade-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Imagem com marca d'água */}
                <div className="relative aspect-[4/3] overflow-hidden bg-black/20 group cursor-pointer"
                  onClick={() => setFotoSelecionada(foto)}>
                  <img
                    src={foto.url}
                    alt={foto.titulo}
                    className="photo-image w-full h-full object-cover"
                  />
                  {/* Marca d'água */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="text-white/40 text-2xl md:text-3xl font-black tracking-widest rotate-[-30deg] select-none">
                      CLICKEFOTOS
                    </div>
                  </div>
                  {foto.vendida && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/90 text-white">
                      ✓ Comprada
                    </div>
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
                        onClick={() => iniciarCompra(foto)}
                        className="w-full py-2.5 rounded-xl glass hover:bg-white/[0.08] font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Baixar novamente
                      </button>
                    ) : (
                      <button
                        onClick={() => iniciarCompra(foto)}
                        className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Comprar HD • R$ {estande.preco_por_foto.toFixed(2)}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Compra */}
      {fotoSelecionada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up"
          onClick={() => {
            setFotoSelecionada(null)
            setStep('ver')
            setEmail('')
            setNome('')
          }}
        >
          <div
            className="glass-strong rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] bg-black/20">
              <img
                src={fotoSelecionada.url}
                alt={fotoSelecionada.titulo}
                className="w-full h-full object-cover rounded-t-3xl"
              />
              <button
                onClick={() => {
                  setFotoSelecionada(null)
                  setStep('ver')
                }}
                className="absolute top-3 right-3 w-10 h-10 rounded-full glass-strong flex items-center justify-center hover:bg-white/[0.1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {step === 'comprar' && (
                <>
                  <h3 className="text-xl font-bold mb-2">Comprar foto em HD</h3>
                  <p className="text-sm text-white/60 mb-6">
                    {fotoSelecionada.titulo} • R$ {estande.preco_por_foto.toFixed(2)}
                  </p>

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
                      <p className="text-xs text-white/40 mt-2">
                        Para receber o link de download
                      </p>
                    </div>

                    <div className="glass rounded-xl p-4 text-sm">
                      <p className="text-white/70">
                        💡 <strong>Demo:</strong> nesta versão de teste o pagamento é simulado.
                        Em produção, será integrado com Stripe ou MercadoPago.
                      </p>
                    </div>

                    <button
                      onClick={finalizarCompra}
                      disabled={comprando || !email || !nome}
                      className="btn-primary w-full py-4 rounded-xl font-semibold disabled:opacity-50"
                    >
                      {comprando ? 'Processando...' : `Pagar R$ ${estande.preco_por_foto.toFixed(2)}`}
                    </button>
                  </div>
                </>
              )}

              {step === 'pago' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Pagamento aprovado!</h3>
                  <p className="text-sm text-white/60 mb-6">
                    Você tem direito a 3 downloads desta foto.
                  </p>
                  <button
                    onClick={baixarHD}
                    disabled={downloadsUsados >= 3}
                    className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    {downloadsUsados >= 3 ? 'Limite atingido' : `Baixar HD (${3 - downloadsUsados}/3 restantes)`}
                  </button>
                </div>
              )}

              {step === 'baixar' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/20 flex items-center justify-center mb-4">
                    <Download className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Download iniciado!</h3>
                  <p className="text-sm text-white/60 mb-6">
                    Seu download começou. Você ainda tem {3 - downloadsUsados} downloads restantes.
                  </p>
                  <button
                    onClick={() => {
                      setFotoSelecionada(null)
                      setStep('ver')
                      setDownloadsUsados(0)
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
    </div>
  )
}
