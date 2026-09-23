'use client'

import Link from 'next/link'
import { ShoppingCart, Camera, ChevronDown, ArrowLeft } from 'lucide-react'

type Variant = 'home' | 'cliente' | 'admin'

interface NavItem {
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
}

interface HeaderProps {
  variant: Variant
  onVoltar?: () => void
  carrinhoCount?: number
  onAbrirCarrinho?: () => void
  navItems?: NavItem[]
  badgeEvento?: string
}

export default function Header({
  variant,
  onVoltar,
  carrinhoCount = 0,
  onAbrirCarrinho,
  navItems = [],
  badgeEvento = '● Feira de Empreendedorismo 2025',
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-rule">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3 grid grid-cols-3 items-center gap-4">
        {/* ESQUERDA: logo + identidade */}
        <div className="flex items-center gap-3 min-w-0">
          {variant === 'admin' && onVoltar && (
            <button
              onClick={onVoltar}
              className="btn-ghost-editorial !p-1.5"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Link href="/" className="flex items-baseline gap-2 group">
            <Camera className="w-4 h-4 text-amber self-center" strokeWidth={2.2} />
            <span className="font-display text-lg font-medium text-ink leading-none">
              ClickeFotos
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-amber font-semibold leading-none">
              PRO
            </span>
          </Link>
          <span className="hidden lg:inline text-xs text-ink-soft font-body">
            Estúdio &amp; Cobertura
          </span>
        </div>

        {/* CENTRO: nav */}
        <nav className="hidden md:flex items-center justify-center gap-1">
          {navItems.length > 0 ? (
            navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`nav-link ${item.active ? 'is-active' : ''}`}
              >
                {item.label}
              </button>
            ))
          ) : (
            <span className="eyebrow text-ink-soft">
              {variant === 'admin'
                ? 'Painel do Fotógrafo'
                : variant === 'cliente'
                ? 'Minha Galeria'
                : 'Resgate de Fotos'}
            </span>
          )}
        </nav>

        {/* DIREITA: badge + carrinho + avatar */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <span className="hidden xl:inline-flex items-center gap-2 badge badge-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-dot" />
            {badgeEvento}
          </span>

          {variant === 'cliente' && (
            <button
              onClick={onAbrirCarrinho}
              className="relative flex items-center gap-2 px-3 py-2 rounded-full bg-surface-2 hover:bg-surface-1 border border-rule transition-colors text-sm font-medium"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Carrinho</span>
              {carrinhoCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-amber text-canvas text-xs font-bold flex items-center justify-center">
                  {carrinhoCount}
                </span>
              )}
            </button>
          )}

          <button
            className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full bg-surface-2 hover:bg-surface-1 border border-rule transition-colors"
            aria-label="Conta"
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber to-amber-deep text-canvas text-xs font-bold flex items-center justify-center">
              DA
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
          </button>
        </div>
      </div>
    </header>
  )
}
