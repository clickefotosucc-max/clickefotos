export interface Pessoa {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  turma: string | null
  preco_por_foto: number
  telefone: string | null
  created_at: string
}

export interface Foto {
  id: string
  pessoa_id: string
  titulo: string
  descricao: string | null
  url: string
  url_hd: string
  vendida: boolean
  created_at: string
}

export interface Compra {
  id: string
  foto_id: string
  cliente_email: string | null
  cliente_nome: string | null
  valor_pago: number | null
  status: 'pendente' | 'pago' | 'cancelado'
  download_token: string | null
  downloads_realizados: number
  max_downloads: number
  created_at: string
}
