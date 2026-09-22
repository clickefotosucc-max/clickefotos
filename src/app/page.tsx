'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Estande } from '@/types'
import AreaCliente from '@/components/AreaCliente'
import AreaAdmin from '@/components/AreaAdmin'
import { Upload, Camera, Lock } from 'lucide-react'

type View = 'home' | 'cliente' | 'admin'

export default function Home() {
  const [view, setView] = useState<View>('home')
  const [codigo, setCodigo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [adminAutenticado, setAdminAutenticado] = useState(false)

  async function buscarEstande(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!codigo.trim()) {
      setErro('Digite o código do seu estande')
      return
    }

    setBuscando(true)

    const { data, error } = await supabase
      .from('estandes')
      .select('*')
      .eq('codigo', codigo.trim().toUpperCase())
      .single()

    if (error || !data) {
      setErro('Código não encontrado. Verifique com o organizador.')
      setBuscando(false)
      return
    }

    // Buscar fotos do estande
    const { data: fotos, error: fotosError } = await supabase
      .from('fotos')
      .select('*')
      .eq('estande_id', data.id)
      .order('created_at', { ascending: false })

    setBuscando(false)

    if (fotosError) {
      setErro('Erro ao carregar fotos')
      return
    }

    setView('cliente')
    // Passar dados via state global (em produção usaria contexto/URL)
    sessionStorage.setItem('estande', JSON.stringify(data))
    sessionStorage.setItem('fotos', JSON.stringify(fotos || []))
  }

  function handleAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (senhaAdmin === 'admin123') {
      setAdminAutenticado(true)
    } else {
      setErro('Senha incorreta')
    }
  }

  // Se estiver na área do cliente
  if (view === 'cliente') {
    const estande: Estande = JSON.parse(sessionStorage.getItem('estande') || '{}')
    const fotos: Foto[] = JSON.parse(sessionStorage.getItem('fotos') || '[]')
    return (
      <AreaCliente
        estande={estande}
        fotos={fotos}
        onVoltar={() => {
          sessionStorage.removeItem('estande')
          sessionStorage.removeItem('fotos')
          setView('home')
          setCodigo('')
        }}
      />
    )
  }

  // Se estiver autenticado como admin
  if (view === 'admin' && adminAutenticado) {
    return <AreaAdmin onVoltar={() => setView('home')} />
  }

  return (
    <div className="min-h-screen text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 blur-md opacity-60"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Clickefotos</h1>
              <p className="text-xs text-white/50 -mt-0.5">Feira de Empreendedorismo</p>
            </div>
          </div>
          <button
            onClick={() => setView('admin')}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-medium hover:bg-white/[0.08] transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            Área do Organizador
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-20">
        {/* Hero */}
        <section className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
            FEIRA DE EMPREENDEDORISMO 2025
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Suas fotos da feira, <br />
            <span className="gradient-text">em um só lugar.</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Digite o código que você recebeu na feira e veja todas as fotos
            do seu estande. Escolha as melhores e leve em alta resolução.
          </p>
        </section>

        {/* Se estiver tentando entrar como admin */}
        {view === 'admin' && !adminAutenticado ? (
          <section className="max-w-md mx-auto animate-fade-up">
            <div className="glass-strong rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Área do Organizador</h3>
                  <p className="text-sm text-white/50">Digite a senha para continuar</p>
                </div>
              </div>

              <form onSubmit={handleAdmin} className="space-y-4">
                <input
                  type="password"
                  value={senhaAdmin}
                  onChange={(e) => setSenhaAdmin(e.target.value)}
                  placeholder="Senha"
                  className="w-full px-4 py-3 rounded-xl"
                  autoFocus
                />
                {erro && (
                  <p className="text-sm text-red-400">{erro}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setView('home')
                      setErro('')
                      setSenhaAdmin('')
                    }}
                    className="flex-1 py-3 rounded-xl glass hover:bg-white/[0.08] font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary py-3 rounded-xl font-semibold"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : (
          /* Card de acesso do cliente */
          <section className="max-w-md mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="glass-strong rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                  🎫
                </div>
                <div>
                  <h3 className="text-xl font-bold">Acessar minhas fotos</h3>
                  <p className="text-sm text-white/50">Use o código recebido na feira</p>
                </div>
              </div>

              <form onSubmit={buscarEstande} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                    Código do estande
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC-X9K"
                    className="w-full px-4 py-4 rounded-xl text-center text-2xl font-mono font-bold tracking-widest"
                    maxLength={7}
                  />
                </div>

                {erro && (
                  <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={buscando}
                  className="btn-primary w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {buscando ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Ver minhas fotos
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="text-xs text-white/40">
                  Não tem o código? Procure o organizador do evento.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Como funciona */}
        <section className="mt-20 grid md:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          {[
            { num: '01', icon: '🎫', title: 'Digite o código', desc: 'Receba seu código único na feira' },
            { num: '02', icon: '📸', title: 'Veja suas fotos', desc: 'Todas as fotos do seu estande' },
            { num: '03', icon: '⬇️', title: 'Baixe em HD', desc: 'Compre e leve em alta resolução' },
          ].map((step) => (
            <div key={step.num} className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{step.icon}</span>
                <span className="text-xs font-mono text-white/30">{step.num}</span>
              </div>
              <h4 className="font-bold text-lg mb-1">{step.title}</h4>
              <p className="text-sm text-white/50">{step.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center text-sm text-white/40">
          Feito com 💜 para a Feira de Empreendedorismo — {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
