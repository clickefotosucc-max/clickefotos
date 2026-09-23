'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto, Pessoa } from '@/types'
import AreaCliente from '@/components/AreaCliente'
import AreaAdmin from '@/components/AreaAdmin'
import Header from '@/components/Header'
import { ArrowRight, Camera, Sparkles, Clock } from 'lucide-react'

export default function Home() {
  const [view, setView] = useState<'home' | 'cliente' | 'admin'>('home')
  const [codigo, setCodigo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [senhaAdmin, setSenhaAdmin] = useState('')
  const [adminAutenticado, setAdminAutenticado] = useState(false)

  async function buscarPessoa(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!codigo.trim()) {
      setErro('Digite seu código de acesso')
      return
    }

    setBuscando(true)

    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('codigo', codigo.trim().toUpperCase())
      .single()

    if (error || !data) {
      setErro('Código não encontrado. Verifique com o organizador.')
      setBuscando(false)
      return
    }

    const { data: fotos, error: fotosError } = await supabase
      .from('fotos')
      .select('*')
      .eq('pessoa_id', data.id)
      .order('created_at', { ascending: false })

    setBuscando(false)

    if (fotosError) {
      setErro('Erro ao carregar fotos')
      return
    }

    setView('cliente')
    sessionStorage.setItem('pessoa', JSON.stringify(data))
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

  if (view === 'cliente') {
    const pessoa: Pessoa = JSON.parse(sessionStorage.getItem('pessoa') || '{}')
    const fotos: Foto[] = JSON.parse(sessionStorage.getItem('fotos') || '[]')
    return (
      <AreaCliente
        pessoa={pessoa}
        fotos={fotos}
        onVoltar={() => {
          sessionStorage.removeItem('pessoa')
          sessionStorage.removeItem('fotos')
          setView('home')
          setCodigo('')
        }}
      />
    )
  }

  if (view === 'admin' && adminAutenticado) {
    return <AreaAdmin onVoltar={() => setView('home')} />
  }

  const navItems = [
    { label: 'Resgatar Fotos', active: view === 'home', onClick: () => { setView('home'); setErro('') } },
    { label: 'Minha Galeria' },
    { label: 'Painel do Fotógrafo', onClick: () => setView('admin') },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        variant="home"
        navItems={navItems}
      />

      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-12 md:py-20">
        {/* HERO — duas colunas em desktop */}
        <section className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center mb-20 md:mb-28 animate-fade-up">
          {/* Coluna texto */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="badge badge-amber">
                <Sparkles className="w-3 h-3" />
                EDIÇÃO OFICIAL 2025
              </span>
              <span className="hidden sm:inline badge badge-muted">
                ESTÚDIO ACREDITAR
              </span>
            </div>

            <h1 className="font-display text-[2.25rem] sm:text-6xl lg:text-7xl font-medium leading-[1.02] tracking-tight mb-6 text-ink">
              Suas fotos
              <br />
              da feira,
              <br />
              <em className="italic text-amber">a um clique</em>
              <br />
              de distância.
            </h1>

            <p className="text-base sm:text-lg text-ink-soft leading-relaxed max-w-lg mb-8">
              Digite o código que você recebeu na feira e veja todas as suas
              fotos reunidas num só lugar. Escolha as melhores, pague via PIX
              e leve em alta resolução direto pelo navegador.
            </p>

            {/* Sessões tempo real — miniaturas */}
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1.5 text-xs text-ink-soft font-medium">
                <Clock className="w-3.5 h-3.5" />
                TEMPO REAL
              </span>
              <span className="flex-1 h-px bg-rule" />
            </div>
            <p className="text-xs text-ink-soft mb-4">
              Sessões recém-fotografadas — últimos 30 min
            </p>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {['12:42', '12:38', '12:31', '12:24'].map((hora, i) => (
                <div key={i} className="relative group">
                  <div
                    className="aspect-[4/3] rounded bg-surface-1 border border-rule overflow-hidden"
                    style={{
                      backgroundImage: `linear-gradient(135deg, hsl(${(i * 47 + 200) % 360}, 30%, 18%) 0%, hsl(${(i * 47 + 240) % 360}, 25%, 12%) 100%)`,
                    }}
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-canvas/85 backdrop-blur-sm text-[10px] font-mono text-ink-soft">
                    {hora}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna card de acesso */}
          <div className="lg:pl-8">
            {view === 'admin' && !adminAutenticado ? (
              <AcessoAdminCard
                senhaAdmin={senhaAdmin}
                setSenhaAdmin={setSenhaAdmin}
                erro={erro}
                onSubmit={handleAdmin}
                onCancel={() => { setView('home'); setErro(''); setSenhaAdmin('') }}
              />
            ) : (
              <AcessoClienteCard
                codigo={codigo}
                setCodigo={setCodigo}
                erro={erro}
                onSubmit={buscarPessoa}
                buscando={buscando}
              />
            )}
          </div>
        </section>

        {/* COMO FUNCIONA — 3 etapas numeradas */}
        <section className="mb-20">
          <div className="flex items-baseline justify-between mb-10 rule pb-6">
            <div>
              <p className="eyebrow mb-2">COMO FUNCIONA</p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-ink">
                Três passos, sem fricção.
              </h2>
            </div>
            <span className="hidden md:inline eyebrow text-ink-muted">
              EDIÇÃO 2025
            </span>
          </div>

          <ol className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                n: '01',
                t: 'Receba seu código',
                d: 'O fotógrafo entrega um código único no dia, registrado no estúdio.',
              },
              {
                n: '02',
                t: 'Veja suas fotos',
                d: 'A galeria pessoal abre com todas as suas imagens já organizadas por sessão.',
              },
              {
                n: '03',
                t: 'Leve em alta resolução',
                d: 'Selecione, pague via PIX e baixe em HD direto pelo navegador.',
              },
            ].map((s) => (
              <li
                key={s.n}
                className="card group hover:border-rule-strong transition-colors"
              >
                <span className="font-display text-5xl text-amber block mb-4 leading-none">
                  {s.n}
                </span>
                <h3 className="font-display text-xl font-medium mb-2 text-ink">
                  {s.t}
                </h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* OFERTA ESPECIAL */}
        <section className="card !bg-surface-2 !border-rule-strong relative overflow-hidden mb-12">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber/10 rounded-full blur-3xl" />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <span className="badge badge-amber mb-3">PACOTE COMPLETO</span>
              <h3 className="font-display text-2xl md:text-3xl font-medium text-ink mb-2">
                Compre o pacote com <em className="italic text-amber">20% off</em>.
              </h3>
              <p className="text-ink-soft text-sm md:text-base max-w-lg">
                Todas as suas fotos em alta resolução por um valor único.
                Disponível na sua galeria após o login.
              </p>
            </div>
            <button
              onClick={() => setView('home')}
              className="btn-ink whitespace-nowrap"
            >
              Ver minha oferta
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="rule-top mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-ink-soft">
          <span className="font-display italic text-champagne">ClickeFotos PRO</span>
          <span>Feito para a Feira de Empreendedorismo — {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}

/* ---------------- Subcomponentes do Hero ---------------- */

function AcessoClienteCard({
  codigo, setCodigo, erro, onSubmit, buscando,
}: {
  codigo: string
  setCodigo: (v: string) => void
  erro: string
  onSubmit: (e: React.FormEvent) => void
  buscando: boolean
}) {
  return (
    <div className="card !p-8 md:!p-10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber to-transparent" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-amber-soft border border-amber/30 flex items-center justify-center">
          <Camera className="w-5 h-5 text-amber" />
        </div>
        <div>
          <p className="eyebrow">ACESSO DA GALERIA</p>
          <p className="text-xs text-ink-soft">Para participantes cadastrados</p>
        </div>
      </div>

      <h2 className="font-display text-2xl md:text-3xl font-medium text-ink mb-2">
        Encontrar minhas fotos
      </h2>
      <p className="text-sm text-ink-soft mb-8">
        Insira o código único que você recebeu no dia.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block eyebrow mb-3">CÓDIGO DE ACESSO</label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="ABC-X9K"
            className="input-editorial-serif tracking-[0.15em] !text-2xl"
            maxLength={7}
          />
        </div>

        {erro && (
          <p className="text-sm text-crimson border-l-2 border-crimson pl-3 bg-crimson/5 py-2">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={buscando}
          className="btn-amber-pill w-full !justify-center !py-3.5"
        >
          {buscando ? 'Buscando…' : (
            <>
              Ver minhas fotos
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="rule pt-4 mt-8">
        <p className="text-xs text-ink-soft">
          Não tem o código? Procure o organizador do evento —
          ele pode emitir um novo na hora.
        </p>
      </div>
    </div>
  )
}

function AcessoAdminCard({
  senhaAdmin, setSenhaAdmin, erro, onSubmit, onCancel,
}: {
  senhaAdmin: string
  setSenhaAdmin: (v: string) => void
  erro: string
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}) {
  return (
    <div className="card !p-8 md:!p-10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber to-transparent" />
      <span className="badge badge-amber mb-6">ACESSO RESTRITO</span>

      <h2 className="font-display text-2xl md:text-3xl font-medium text-ink mb-2">
        Painel do Fotógrafo
      </h2>
      <p className="text-sm text-ink-soft mb-8">
        Gestão de participantes, sessões e upload de arquivos RAW.
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block eyebrow mb-3">SENHA DE ACESSO</label>
          <input
            type="password"
            value={senhaAdmin}
            onChange={(e) => setSenhaAdmin(e.target.value)}
            placeholder="••••••••"
            className="input-editorial"
            autoFocus
          />
        </div>

        {erro && (
          <p className="text-sm text-crimson border-l-2 border-crimson pl-3 bg-crimson/5 py-2">
            {erro}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost-editorial">
            Cancelar
          </button>
          <button type="submit" className="btn-ink flex-1">
            Entrar no painel
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
