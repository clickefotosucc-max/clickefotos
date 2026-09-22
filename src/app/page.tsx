'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto } from '@/types'

export default function Home() {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('todas')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [autor, setAutor] = useState('')
  const [categoria, setCategoria] = useState('geral')
  const [arquivo, setArquivo] = useState<File | null>(null)

  useEffect(() => {
    carregarFotos()
    // Carrega likes do localStorage
    const stored = localStorage.getItem('clickefotos-likes')
    if (stored) {
      try {
        setLikedIds(new Set(JSON.parse(stored)))
      } catch {}
    }
  }, [])

  async function carregarFotos() {
    const { data, error } = await supabase
      .from('fotos')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFotos(data)
    }
    setLoading(false)
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

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave' || e.type === 'drop') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()

    if (!arquivo || !titulo || !autor) {
      alert('Preencha todos os campos obrigatórios!')
      return
    }

    setUploading(true)

    const nomeArquivo = `${Date.now()}-${arquivo.name.replace(/\s/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(nomeArquivo, arquivo)

    if (uploadError) {
      alert('Erro ao fazer upload da imagem: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('fotos')
      .getPublicUrl(nomeArquivo)

    const { error: insertError } = await supabase.from('fotos').insert([
      {
        titulo,
        descricao: descricao || null,
        autor,
        categoria,
        url: urlData.publicUrl,
        likes: 0,
      },
    ])

    if (insertError) {
      alert('Erro ao salvar: ' + insertError.message)
    } else {
      setTitulo('')
      setDescricao('')
      setAutor('')
      setArquivo(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await carregarFotos()
    }

    setUploading(false)
  }

  async function curtir(foto: Foto) {
    if (likedIds.has(foto.id)) return

    const novosLiked = new Set(likedIds)
    novosLiked.add(foto.id)
    setLikedIds(novosLiked)
    localStorage.setItem('clickefotos-likes', JSON.stringify([...novosLiked]))

    await supabase
      .from('fotos')
      .update({ likes: foto.likes + 1 })
      .eq('id', foto.id)

    carregarFotos()
  }

  const categorias = [
    { value: 'todas', label: 'Todas', icon: '✨' },
    { value: 'geral', label: 'Geral', icon: '📷' },
    { value: 'produtos', label: 'Produtos', icon: '🛍️' },
    { value: 'estandes', label: 'Estandes', icon: '🏪' },
    { value: 'equipe', label: 'Equipe', icon: '👥' },
    { value: 'apresentacoes', label: 'Apresentações', icon: '🎤' },
  ]

  const fotosFiltradas = filter === 'todas'
    ? fotos
    : fotos.filter(f => f.categoria === filter)

  const totalLikes = fotos.reduce((acc, f) => acc + f.likes, 0)

  return (
    <div className="min-h-screen text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 blur-md opacity-60"></div>
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl">
                📸
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Clickefotos</h1>
              <p className="text-xs text-white/50 -mt-0.5">Feira de Empreendedorismo</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-white/60">Ao vivo</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-sm">
              <span className="text-cyan-400">📷</span>
              <span className="font-semibold">{fotos.length}</span>
              <span className="text-white/50">fotos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-sm">
              <span className="text-pink-400">❤️</span>
              <span className="font-semibold">{totalLikes}</span>
              <span className="text-white/50">curtidas</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-medium mb-6 animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
          FEIRA DE EMPREENDEDORISMO 2025
        </div>
        <h2 className="text-5xl md:text-7xl font-black tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          Cada clique, <br />
          <span className="gradient-text">uma história de negócio.</span>
        </h2>
        <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          Registre os melhores momentos da feira. Mostre seus produtos, sua equipe,
          sua apresentação. Cada foto conta a história do seu empreendimento.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-6 pb-20">

        {/* Formulário de Upload */}
        <section className="mb-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="glass-strong rounded-3xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                ⬆️
              </div>
              <div>
                <h3 className="text-2xl font-bold">Enviar nova foto</h3>
                <p className="text-sm text-white/50">Compartilhe um momento da feira</p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="grid gap-6 md:grid-cols-2">
              {/* Drop Zone */}
              <div className="md:col-span-2">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden ${
                    dragActive
                      ? 'border-violet-400 bg-violet-500/10 scale-[1.02]'
                      : 'border-white/10 hover:border-white/30 bg-white/[0.02]'
                  }`}
                >
                  {previewUrl ? (
                    <div className="relative aspect-video">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                        <div className="text-white text-sm font-medium">
                          ✓ Arquivo selecionado — clique para trocar
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
                      <div className="text-5xl animate-float">📸</div>
                      <div className="text-center">
                        <p className="font-semibold text-white/90">
                          Arraste sua foto aqui
                        </p>
                        <p className="text-sm text-white/50 mt-1">
                          ou clique para selecionar do dispositivo
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs text-white/40">
                        <span>PNG</span>•<span>JPG</span>•<span>WEBP</span>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Título da foto *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Estande EcoTech"
                  className="w-full px-4 py-3 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Equipe / Autor *
                </label>
                <input
                  type="text"
                  value={autor}
                  onChange={(e) => setAutor(e.target.value)}
                  placeholder="Ex: Equipe EcoTech - 3ºA"
                  className="w-full px-4 py-3 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Categoria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                >
                  <option value="geral">📷 Geral</option>
                  <option value="produtos">🛍️ Produtos</option>
                  <option value="estandes">🏪 Estandes</option>
                  <option value="equipe">👥 Equipe</option>
                  <option value="apresentacoes">🎤 Apresentações</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Conte um pouco sobre a foto..."
                  className="w-full px-4 py-3 rounded-xl"
                />
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      Publicar foto
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Filtros */}
        <section className="mb-8 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {categorias.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === cat.value
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/30'
                    : 'glass hover:bg-white/[0.08] text-white/70 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Galeria */}
        <section>
          {loading ? (
            <div className="text-center py-24">
              <div className="inline-block w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
              <p className="text-white/50 mt-4">Carregando galeria...</p>
            </div>
          ) : fotosFiltradas.length === 0 ? (
            <div className="text-center py-24 glass-strong rounded-3xl">
              <div className="text-7xl mb-4 opacity-50">📷</div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma foto ainda</h3>
              <p className="text-white/50">
                {filter === 'todas'
                  ? 'Seja o primeiro a compartilhar um momento!'
                  : 'Nenhuma foto nesta categoria.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="text-2xl font-bold">
                  {filter === 'todas' ? 'Galeria' : categorias.find(c => c.value === filter)?.label}
                </h3>
                <span className="text-sm text-white/50">
                  {fotosFiltradas.length} {fotosFiltradas.length === 1 ? 'foto' : 'fotos'}
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {fotosFiltradas.map((foto, idx) => {
                  const liked = likedIds.has(foto.id)
                  return (
                    <article
                      key={foto.id}
                      className="photo-card glass-strong rounded-3xl overflow-hidden animate-fade-up"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
                        <img
                          src={foto.url}
                          alt={foto.titulo}
                          className="photo-image w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold glass-strong backdrop-blur-xl">
                            {foto.categoria}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <h4 className="font-bold text-lg leading-tight line-clamp-1">
                          {foto.titulo}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-white/50">
                          <span>@{foto.autor}</span>
                        </div>
                        {foto.descricao && (
                          <p className="text-sm text-white/60 mt-3 line-clamp-2 leading-relaxed">
                            {foto.descricao}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
                          <button
                            onClick={() => curtir(foto)}
                            disabled={liked}
                            className={`like-btn flex items-center gap-2 text-sm font-semibold ${
                              liked ? 'liked' : ''
                            } ${liked ? 'text-pink-400 cursor-default' : 'text-white/60 hover:text-pink-400'}`}
                          >
                            <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
                            <span>{foto.likes}</span>
                          </button>
                          <time className="text-xs text-white/40">
                            {new Date(foto.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </time>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm">
              📸
            </div>
            <span className="font-bold">Clickefotos</span>
          </div>
          <p className="text-sm text-white/40 text-center md:text-right">
            Feito com 💜 para a Feira de Empreendedorismo — {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
