export function gerarLinkWhatsApp(dados: {
  nome: string
  email: string
  pessoa: string
  codigo: string
  quantidade: number
  valor: number
  pixCopiaCola: string
  whatsappDestino: string
}): string {
  const valorFormatado = dados.valor.toFixed(2).replace('.', ',')

  const mensagem = `Olá! Acabei de fazer o pagamento PIX de R$ ${valorFormatado} pela compra de ${dados.quantidade} foto(s) no Clickefotos.

*Dados da compra:*
👤 Nome: ${dados.nome}
📧 Email: ${dados.email}
🎯 Pessoa nas fotos: ${dados.pessoa}
🔑 Código: ${dados.codigo}

*Código PIX copia e cola:*
\`${dados.pixCopiaCola}\`

Aguardo a confirmação para baixar as fotos em HD. Obrigado!`

  const numero = dados.whatsappDestino.replace(/\D/g, '')
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}
