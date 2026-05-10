import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchUSQuote, fetchUSBatchQuotes } from '../services/usStockApi.js'

export const useUSStockStore = defineStore('usStocks', () => {
  const stocks = ref(JSON.parse(localStorage.getItem('us_stock_list') || '[]'))
  const liveData = ref({})
  const loading = ref(false)
  let refreshTimer = null

  function save() {
    localStorage.setItem('us_stock_list', JSON.stringify(stocks.value))
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  function addStock({ symbol, name, tags, note = '', category = '' }) {
    if (stocks.value.some(s => s.symbol === symbol)) return false

    stocks.value.unshift({
      id: genId(),
      symbol: symbol.toUpperCase(),
      name,
      tags: [...tags],
      note,
      category,
      buyDate: new Date().toISOString().split('T')[0],
      reviews: [],
      createdAt: new Date().toISOString(),
      buyPrice: null,
      targetPrice: null,
      stopLossPrice: null,
    })

    save()
    refreshLiveData()
    return true
  }

  function removeStock(id) {
    stocks.value = stocks.value.filter(s => s.id !== id)
    save()
  }

  function updateStockTags(id, tags) {
    const stock = stocks.value.find(s => s.id === id)
    if (stock) { stock.tags = [...tags]; save() }
  }

  function updateStockCategory(id, category) {
    const stock = stocks.value.find(s => s.id === id)
    if (stock) { stock.category = category; save() }
  }

  function updateStockPrice(id, { buyPrice, targetPrice, stopLossPrice }) {
    const stock = stocks.value.find(s => s.id === id)
    if (stock) {
      if (buyPrice !== undefined) stock.buyPrice = buyPrice
      if (targetPrice !== undefined) stock.targetPrice = targetPrice
      if (stopLossPrice !== undefined) stock.stopLossPrice = stopLossPrice
      save()
    }
  }

  function updateStockNote(id, note) {
    const stock = stocks.value.find(s => s.id === id)
    if (stock) { stock.note = note; save() }
  }

  function addReview(id, note = '') {
    const stock = stocks.value.find(s => s.id === id)
    if (stock) {
      stock.reviews = stock.reviews || []
      stock.reviews.unshift({ date: new Date().toISOString().split('T')[0], note })
      save()
    }
  }

  function getQuote(symbol) {
    return liveData.value[symbol.toUpperCase()] || null
  }

  async function refreshLiveData() {
    if (!stocks.value.length) return
    loading.value = true
    try {
      const symbols = stocks.value.map(s => s.symbol)
      const quotes = await fetchUSBatchQuotes(symbols)
      const map = {}
      quotes.forEach(q => { if (q) map[q.symbol] = q })
      liveData.value = map
    } catch (e) {
      console.error('refreshLiveData error:', e)
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh(intervalMs = 20000) {
    stopAutoRefresh()
    refreshLiveData()
    refreshTimer = setInterval(refreshLiveData, intervalMs)
  }

  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  }

  const stocksWithQuote = computed(() =>
    stocks.value.map(s => ({ ...s, quote: liveData.value[s.symbol] || null }))
  )

  const reviewStats = computed(() => {
    const now = Date.now()
    return stocks.value.map(s => {
      const lastReview = (s.reviews || [])[0]
      const lastReviewDate = lastReview
        ? new Date(lastReview.date).getTime()
        : new Date(s.createdAt).getTime()
      const daysSince = Math.floor((now - lastReviewDate) / 86400000)
      return { id: s.id, daysSince, status: daysSince >= 30 ? 'urgent' : daysSince >= 7 ? 'review' : 'ok' }
    })
  })

  return {
    stocks, stocksWithQuote, liveData, loading, reviewStats,
    addStock, removeStock, updateStockTags, updateStockCategory,
    updateStockPrice, updateStockNote,
    addReview, getQuote, refreshLiveData, startAutoRefresh, stopAutoRefresh, save
  }
})
