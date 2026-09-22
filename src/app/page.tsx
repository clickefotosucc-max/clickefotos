'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Foto } from '@/types'

export default function Home() {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Form states
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [autor, setAutor] = useState('')
  const [categoria, setCategoria] = useState('geral')
  const [arquivo, setArquivo] = useState<File | null>(null)

  // Carregar fotos
  useEffect(() => {
    carregarFotos()
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

  // Upload de foto
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()

    if (!arquivo || !titulo || !autor) {
      alert('Preencha todos os campos obrigatórios!')
      return
    }

    setUploading(true)

    // Upload da imagem para o Supabase Storage
    const nomeArquivo = `${Date.now()}-${arquivo.name}`
    const { error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(nomeArquivo, arquivo)

    if (uploadError) {
      alert('Erro ao fazer upload da imagem!')
      setUploading(false)
      return
    }

    // Pegar URL pública
    const { data: urlData } = supabase.storage
      .from('fotos')
      .getPublicUrl(nomeArquivo)

    // Salvar no banco
    const { error: insertError } = await supabase.from('fotos').insert([
      {
        titulo,
        descricao,
        autor,
        categoria,
        url: urlData.publicUrl,
        likes: 0,
      },
    ])

    if (insertError) {
      alert('Erro ao salvar no banco de dados!')
    } else {
      // Limpar form
      setTitulo('')
      setDescricao('')
      setAutor('')
      setArquivo(null)
      ;(document.getElementById('file-input') as HTMLInputElement).value = ''
      carregarFotos()
    }

    setUploading(false)
  }

  // Curtir foto
  async function curtir(foto: Foto) {
    await supabase
      .from('fotos')
      .update({ likes: foto.likes + 1 })
      .eq('id', foto.id)

    carregarFotos()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <span className="text-4xl">📸</span>
                Clickefotos
              </h1>
              <p className="text-gray-500 mt-1">
                Feiras de Empreendedorismo — Registre os melhores momentos!
              </p>
            </div>
            <div className="flex gap-2">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                📷 {fotos.length} fotos
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Formulário de Upload */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>⬆️</span> Enviar Nova Foto
          </h2>

          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Estande da Empresa X"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autor/Equipe *
              </label>
              <input
                type="text"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                placeholder="Ex: João Silva - 3º Ano A"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="geral">Geral</option>
                <option value="produtos">Produtos</option>
                <option value="estandes">Estandes</option>
                <option value="equipe">Equipe</option>
                <option value="apresentacoes">Apresentações</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição da foto"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arquivo de Imagem *
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {uploading ? '⏳ Enviando...' : '📤 Enviar Foto'}
              </button>
            </div>
          </form>
        </section>

        {/* Galeria de Fotos */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🖼️</span> Galeria de Fotos
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin text-4xl">⏳</div>
              <p className="text-gray-500 mt-2">Carregando fotos...</p>
            </div>
          ) : fotos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-500 text-lg">
                Nenhuma foto ainda. Seja o primeiro a enviar!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fotos.map((foto) => (
                <div
                  key={foto.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <img
                      src={foto.url}
                      alt={foto.titulo}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                      {foto.categoria}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {foto.titulo}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      por {foto.autor}
                    </p>
                    {foto.descricao && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {foto.descricao}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => curtir(foto)}
                        className="flex items-center gap-1 text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        <span className="text-lg">❤️</span>
                        <span className="font-medium">{foto.likes}</span>
                      </button>
                      <span className="text-xs text-gray-400">
                        {new Date(foto.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>
            Feito com ❤️ para a Feira de Empreendedorismo • Clickefotos © 2024
          </p>
        </div>
      </footer>
    </div>
  )
}
