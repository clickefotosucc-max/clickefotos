export interface Foto {
  id: string
  titulo: string
  descricao: string | null
  url: string
  autor: string
  categoria: string
  likes: number
  created_at: string
}

export interface Categoria {
  id: string
  nome: string
  slug: string
}
