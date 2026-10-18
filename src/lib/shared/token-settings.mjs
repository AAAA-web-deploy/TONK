export const validContract = value => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value.trim()) && !/^0x0{40}$/i.test(value.trim())

export function tradeLink(config) {
  if (!validContract(config.contractAddress)) return ''
  if (config.tradeUrl) {
    try {
      const url = new URL(config.tradeUrl)
      return url.protocol === 'https:' ? url.href : ''
    } catch { return '' }
  }
  const url = new URL('https://app.uniswap.org/swap')
  url.searchParams.set('chain', 'ethereum')
  url.searchParams.set('inputCurrency', 'ETH')
  url.searchParams.set('outputCurrency', config.contractAddress.trim())
  return url.href
}
