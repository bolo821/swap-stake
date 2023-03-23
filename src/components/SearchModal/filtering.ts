import { isAddress } from '../../utils'
import { Token } from '@trisolaris/sdk'

const tokenList = [
  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  '0xa3Fa99A148fA48D14Ed51d610c367C61876997F1',
  '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
]

export function filterTokens(tokensIn: Token[], search: string): Token[] {
  const tokens = tokensIn.filter(token => {
    return tokenList.includes(token.address)
  })
  
  if (search.length === 0) return tokens

  const searchingAddress = isAddress(search)

  if (searchingAddress) {
    return tokens.filter(token => token.address === searchingAddress)
  }

  const lowerSearchParts = search
    .toLowerCase()
    .split(/\s+/)
    .filter(s => s.length > 0)

  if (lowerSearchParts.length === 0) {
    return tokens
  }

  const matchesSearch = (s: string): boolean => {
    const sParts = s
      .toLowerCase()
      .split(/\s+/)
      .filter(s => s.length > 0)

    return lowerSearchParts.every(p => p.length === 0 || sParts.some(sp => sp.startsWith(p) || sp.endsWith(p)))
  }

  return tokens.filter(token => {
    const { symbol, name } = token

    return (symbol && matchesSearch(symbol)) || (name && matchesSearch(name))
  })
}
