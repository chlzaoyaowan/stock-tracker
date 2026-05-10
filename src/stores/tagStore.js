import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TAG_COLORS = [
  '#f0883e', '#58a6ff', '#3fb950', '#d29922', '#f85149',
  '#a371f7', '#39c5cf', '#db61a2', '#e3b341', '#73c7d1'
]

export function tagColor(tag) {
  let hash = 0
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export const useTagStore = defineStore('tags', () => {
  const tags = ref(JSON.parse(localStorage.getItem('stock_tags') || '[]'))

  function save() {
    localStorage.setItem('stock_tags', JSON.stringify(tags.value))
  }

  function addTag(name) {
    const t = name.trim()
    if (!t || tags.value.some(x => x.name === t)) return false
    tags.value.push({ name: t, color: tagColor(t), count: 0 })
    save()
    return true
  }

  function removeTag(name) {
    tags.value = tags.value.filter(t => t.name !== name)
    save()
  }

  function renameTag(oldName, newName) {
    const tag = tags.value.find(t => t.name === oldName)
    if (tag) {
      tag.name = newName
      tag.color = tagColor(newName)
      save()
    }
  }

  function incrementCount(names) {
    names.forEach(name => {
      const tag = tags.value.find(t => t.name === name)
      if (tag) tag.count++
    })
    save()
  }

  const sortedTags = computed(() =>
    [...tags.value].sort((a, b) => b.count - a.count)
  )

  // 预设常用概念标签
  function initDefaultTags() {
    if (tags.value.length === 0) {
      const defaults = [
        '商业航天', '芯片', 'AI', '新能源', '军工', '医疗器械',
        '卫星导航', '低空经济', '机器人', '半导体', '消费电子',
        '卫星通信', '无人机', '新材料', '量子计算', '氢能源',
        '储能', '智能驾驶', '创新药', '数字经济', '国产替代',
        '卫星互联网', '算力', '大模型', '脑机接口', '基因编辑'
      ]
      defaults.forEach(name => {
        tags.value.push({ name, color: tagColor(name), count: 0 })
      })
      save()
    }
  }

  initDefaultTags()

  return { tags, sortedTags, addTag, removeTag, renameTag, incrementCount }
})
