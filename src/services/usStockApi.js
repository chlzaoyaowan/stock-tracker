/**
 * 美股数据服务
 * - 行情: Finnhub API (需要 free API key, https://finnhub.io)
 * - 搜索: Finnhub symbol search (同 one key works for both)
 *
 * API Key 配置: localStorage['us_stock_apikey']
 * 注册免费 key: https://finnhub.io/register (免费 tier 足够日常使用)
 */

export function getFinnhubKey() {
  return localStorage.getItem('us_stock_apikey') || ''
}

// US stock symbol 格式校验 (1-5字母, 可选 .OB/.PK/.F/.O 等后缀)
function isValidSymbolFormat(s) {
  return /^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(s.toUpperCase())
}

// ============================================
// Finnhub 行情
// ============================================
export async function fetchUSQuote(symbol) {
  const key = getFinnhubKey()
  if (!key) return { error: 'no_apikey' }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`
    )
    const data = await res.json()
    if (data.error) return { error: data.error }

    return {
      symbol,
      price: data.c || 0,
      change: data.d || 0,
      changePct: data.dp || 0,
      open: data.o || 0,
      high: data.h || 0,
      low: data.l || 0,
      previousClose: data.pc || 0,
      timestamp: data.t || 0,
    }
  } catch (e) {
    return { error: e.message }
  }
}

// 批量获取（串行，避免频率限制）
export async function fetchUSBatchQuotes(symbols) {
  const results = []
  for (const sym of symbols) {
    const q = await fetchUSQuote(sym)
    if (!q.error) results.push(q)
    await new Promise(r => setTimeout(r, 150))
  }
  return results
}

// ============================================
// Finnhub K线数据
// ============================================
export async function fetchUSCandles(symbol) {
  const key = getFinnhubKey()
  if (!key) return { candles: [], symbol }

  const now = Math.floor(Date.now() / 1000)
  const fromTs = now - 60 * 86400
  const toTs = now

  try {
    const url = `/api/finnhub/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${fromTs}&to=${toTs}&token=${key}`
    const res = await fetch(url)
    const text = await res.text()
    if (text.startsWith('<')) throw new Error('invalid_response')
    const data = JSON.parse(text)

    if (data.s === 'no_data' || data.s === 'error' || !data.t?.length) {
      return { candles: [], symbol }
    }

    const candles = data.t.map((t, i) => ({
      time: t,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
    }))

    return { candles, symbol }
  } catch (e) {
    return { error: e.message, candles: [] }
  }
}

// ============================================
// Finnhub 股票搜索 (与行情用同一 key)
// ============================================
export async function searchUSStocks(keyword) {
  if (!keyword.trim()) return []
  const q = keyword.trim().toUpperCase()

  // 直接输入符合格式的 symbol → 兜底
  if (isValidSymbolFormat(q)) {
    return [{ symbol: q, name: q, exchange: '' }]
  }

  const key = getFinnhubKey()
  if (!key) {
    // 无 key：只返回符合格式的兜底
    return []
  }

  try {
    const url = `/api/finnhub/search?q=${encodeURIComponent(q)}&token=${key}`
    const res = await fetch(url)
    const data = await res.json()

    return (data.result || []).slice(0, 10).map(item => ({
      symbol: item.symbol,
      name: item.description || item.symbol,
      exchange: item.exchange || '',
    })).filter(s => s.symbol && isValidSymbolFormat(s.symbol))
  } catch (e) {
    return []
  }
}
