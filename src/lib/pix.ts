// Gera código PIX no formato EMV/BR Code para QR Code
// Baseado na especificação do Banco Central do Brasil

function pad(num: string, length: number): string {
  return num.padStart(length, '0')
}

function formatField(id: string, value: string): string {
  return `${id}${pad(value.length.toString(), 2)}${value}`
}

export interface PixData {
  chave: string
  valor: number
  nomeRecebedor: string
  cidade: string
  txid?: string
  descricao?: string
}

export function gerarPixCopiaCola(data: PixData): string {
  const {
    chave,
    valor,
    nomeRecebedor = 'RECEBEDOR',
    cidade = 'SAO PAULO',
    txid = 'CLICK',
    descricao = ''
  } = data

  // ID 00 - Payload Format Indicator
  const id00 = formatField('00', '01')

  // ID 26 - Merchant Account Information (GUI + chave)
  const gui = formatField('00', 'br.gov.bcb.pix')
  const chaveField = formatField('01', chave)
  const merchantAccount = formatField('26', gui + chaveField)

  // ID 52 - Merchant Category Code
  const id52 = formatField('52', '0000')

  // ID 53 - Transaction Currency (986 = BRL)
  const id53 = formatField('53', '986')

  // ID 54 - Transaction Amount
  const valorFormatado = valor.toFixed(2)
  const id54 = formatField('54', valorFormatado)

  // ID 58 - Country Code
  const id58 = formatField('58', 'BR')

  // ID 59 - Merchant Name
  const nome = nomeRecebedor.slice(0, 25).toUpperCase()
  const id59 = formatField('59', nome)

  // ID 60 - Merchant City
  const city = cidade.slice(0, 15).toUpperCase()
  const id60 = formatField('60', city)

  // ID 62 - Additional Data (txid)
  const txidField = formatField('05', txid.slice(0, 25))
  const id62 = formatField('62', txidField)

  // Monta o payload sem o CRC16
  const payloadSemCRC = id00 + merchantAccount + id52 + id53 + id54 + id58 + id59 + id60 + id62 + '6304'

  // Calcula CRC16-CCITT
  const crc = calcularCRC16(payloadSemCRC)

  return payloadSemCRC + crc
}

function calcularCRC16(payload: string): string {
  // Polinômio: 0x1021 (CCITT)
  let crc = 0xFFFF

  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i)
    crc = crc ^ (byte << 8)
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0')
}
