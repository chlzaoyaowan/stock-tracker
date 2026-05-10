import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCategoryStore = defineStore('categories', () => {
  const categories = ref(JSON.parse(localStorage.getItem('stock_categories') || '[]'))

  function save() {
    localStorage.setItem('stock_categories', JSON.stringify(categories.value))
  }

  function addCategory(name) {
    const t = name.trim()
    if (!t || categories.value.some(c => c.name === t)) return false
    categories.value.push({ name: t, id: Date.now().toString(36) })
    save()
    return true
  }

  function removeCategory(name) {
    categories.value = categories.value.filter(c => c.name !== name)
    save()
  }

  function renameCategory(oldName, newName) {
    const cat = categories.value.find(c => c.name === oldName)
    if (cat) { cat.name = newName; save() }
  }

  // 预设分类
  function initDefaults() {
    if (categories.value.length === 0) {
      categories.value = [
        { name: '全部', id: 'all' },
        { name: 'CPO板块', id: 'cpo' },
        { name: 'AI算力', id: 'ai' },
        { name: '商业航天', id: 'hangtian' },
        { name: '军工', id: 'jungong' },
        { name: '其他', id: 'other' },
      ]
      save()
    }
  }

  initDefaults()

  return { categories, addCategory, removeCategory, renameCategory }
})
