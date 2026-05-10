/**
 * A股数据服务
 * - 行情：腾讯财经 API (通过 Vite 代理，/api/tencent → qt.gtimg.cn)
 * - 搜索：新浪搜索 API (直连，GBK 编码)
 */

const BASE = '/api/tencent'
const gbkDecoder = new TextDecoder('gbk')

// --- 腾讯行情 fetch ---
async function fetchGbkText(url) {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  return gbkDecoder.decode(buf)
}

function parseTencentQuote(text) {
  const match = text.match(/="([^"]+)"/)
  if (!match) return null
  const fields = match[1].split('~')
  if (!fields || fields.length < 50 || fields[1] === '') return null
  return fields
}

// --- 腾讯行情 API ---
export async function fetchStockQuote(code) {
  const qtCode = /^\d{6}$/.test(code)
    ? (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')
        ? `sh${code}` : `sz${code}`)
    : code

  try {
    const text = await fetchGbkText(`${BASE}/q=${qtCode}`)
    const fields = parseTencentQuote(text)
    if (!fields) return null

    const price = parseFloat(fields[3]) || 0
    const yesterdayClose = parseFloat(fields[4]) || 0
    const change = price - yesterdayClose
    const changePct = yesterdayClose ? (change / yesterdayClose * 100) : 0

    return {
      name: fields[1],
      code,
      price,
      yesterdayClose,
      open: parseFloat(fields[5]) || 0,
      change: parseFloat(change.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
      high: parseFloat(fields[33]) || 0,
      low: parseFloat(fields[34]) || 0,
      volume: parseInt(fields[6]) || 0,
      amount: parseFloat(fields[37]) || 0,
      time: fields[31] || '',
      date: fields[30] || '',
    }
  } catch (e) {
    console.error('fetchStockQuote error:', e)
    return null
  }
}

export async function fetchBatchQuotes(codes) {
  if (!codes.length) return []
  const qtCodes = codes.map(code => {
    if (/^[a-z]+\d{6}$/.test(code)) return code // 已经是 sh000001 格式
    if (/^\d{6}$/.test(code)) {
      return code.startsWith('6') || code.startsWith('5') || code.startsWith('9')
        ? `sh${code}` : `sz${code}`
    }
    return code
  }).join(',')

  try {
    const text = await fetchGbkText(`${BASE}/q=${qtCodes}`)
    const results = []
    for (const line of text.split('\n')) {
      if (!line.includes('="')) continue
      const match = line.match(/="([^"]+)"/)
      if (!match) continue
      const fields = match[1].split('~')
      if (!fields || fields.length < 10 || fields[1] === '') continue
      // 从 v_sz300760 这样的字段名中提取代码
      const rawCode = line.match(/v_([a-z]+\d+)/)?.[1] || ''
      const code = rawCode.replace(/^[a-z]+/, '')
      const price = parseFloat(fields[3]) || 0
      const yesterdayClose = parseFloat(fields[4]) || 0
      const change = price - yesterdayClose
      const changePct = yesterdayClose ? (change / yesterdayClose * 100) : 0
      results.push({
        name: fields[1], code,
        price, yesterdayClose,
        change: parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
        open: parseFloat(fields[5]) || 0,
        high: parseFloat(fields[33]) || 0,
        low: parseFloat(fields[34]) || 0,
        volume: parseInt(fields[6]) || 0,
        time: fields[31] || '',
      })
    }
    return results
  } catch (e) {
    console.error('fetchBatchQuotes error:', e)
    return []
  }
}

export async function fetchIndex() {
  return fetchBatchQuotes(['sh000001', 'sz399001', 'sz399006'])
}

// --- 新浪股票搜索 API ---
export async function fetchSinaMinute(code) {
  const sym = code.startsWith('6') || code.startsWith('5') || code.startsWith('9')
    ? `sh${code}`
    : `sz${code}`
  try {
    const url = `/api/sina/quotes/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${sym}&scale=5&datalen=48&ma=no`
    const res = await fetch(url)
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const recent = data.slice(-48)
    const prices = recent.map(d => parseFloat(d.close))
    const openPrice = parseFloat(recent[0].open)
    const lastPrice = parseFloat(recent[recent.length - 1].close)
    const highPrice = Math.max(...recent.map(d => parseFloat(d.high)))
    const lowPrice = Math.min(...recent.map(d => parseFloat(d.low)))
    return { prices, isUp: lastPrice >= openPrice, openPrice, lastPrice, highPrice, lowPrice }
  } catch (e) {
    return null
  }
}

export async function searchStocks(keyword) {
  if (!keyword || keyword.trim().length < 1) return []

  // 直接输入6位代码 → 返回该代码
  if (/^\d{6}$/.test(keyword.trim())) {
    return [{ code: keyword.trim(), name: keyword.trim(), source: 'code' }]
  }

  try {
    // 新浪搜索 API — 通过 Vite 代理避免 CORS
    const res = await fetch(
      `/api/sina/search/type=11,12,13,14,15&key=${encodeURIComponent(keyword.trim())}&name=xi&count=10`,
      { headers: { Referer: 'https://finance.sina.com.cn' } }
    )
    const buf = await res.arrayBuffer()
    const text = gbkDecoder.decode(buf)

    // 解析 var xi="name,type,code,market,name2,,name3,...";
    const match = text.match(/="([^"]+)"/)
    if (!match) return []

    const items = match[1].split(';').map(item => {
      const parts = item.split(',')
      if (parts.length < 4) return null
      const name = parts[0]
      // type=11=A股, 12=指数, 13=基金, 14=港股, 15=美股
      const type = parseInt(parts[1])
      const marketCode = parts[3] // e.g. "sz300005" or "sh600000"
      if (!name || !marketCode) return null
      // 提取6位代码
      const code = marketCode.replace(/^[a-z]+/, '')
      // 只返回A股 (type=11)
      return { code, name, type, source: 'search' }
    }).filter(Boolean)

    // 过滤：只保留A股，且代码6位数字
    return items.filter(i => /^\d{6}$/.test(i.code)).slice(0, 10)
  } catch (e) {
    console.error('searchStocks error:', e)
    return []
  }
}
