<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h3>导入自选股</h3>
          <button class="close-btn" @click="close">×</button>
        </div>
        <div class="modal-body">
          <p class="hint">支持 Excel (.xlsx, .xls) 和 JSON (.json) 格式</p>
          <p class="hint">表格列：<strong>股票代码</strong>、<strong>股票名称</strong>（第一行为表头）</p>

          <div class="drop-zone" :class="{ dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop" @click="$refs.fileInput.click()">
            <input ref="fileInput" type="file" accept=".xlsx,.xls,.json" style="display:none" @change="onFileChange">
            <p v-if="!fileName">点击选择文件 或 拖拽文件到此处</p>
            <p v-else>{{ fileName }}</p>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>

          <div v-if="preview.length" class="preview">
            <div class="preview-title">预览（共 {{ preview.length }} 只）：</div>
            <div class="preview-list">
              <div v-for="s in preview" :key="s.code" class="preview-item">
                <span class="pname">{{ s.name }}</span>
                <span class="pcode">{{ s.code }}</span>
                <span v-if="s.duplicate" class="dup-tag">已存在</span>
              </div>
            </div>
          </div>

          <!-- 分类选择 -->
          <div class="form-group">
            <label>分类</label>
            <div class="category-picker">
              <div
                v-for="cat in categoryStore.categories.filter(c => c.name !== '全部')"
                :key="cat.id || cat.name"
                class="cat-item"
                :class="{ active: selectedCategory === cat.name }"
                @click="selectedCategory = selectedCategory === cat.name ? '' : cat.name"
              >{{ cat.name }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" :disabled="validCount === 0 || importing" @click="doImport">
            {{ importing ? '导入中...' : `确认导入 (${validCount}只)` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useCategoryStore } from '../stores/categoryStore.js'

const props = defineProps({ modelValue: Boolean, existingCodes: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])

const categoryStore = useCategoryStore()

const fileInput = ref(null)
const fileName = ref('')
const dragging = ref(false)
const error = ref('')
const preview = ref([])
const validCount = ref(0)
const importing = ref(false)
const selectedCategory = ref('')

let rawData = []

watch(() => props.modelValue, (val) => {
  if (val) {
    fileName.value = ''
    preview.value = []
    validCount.value = 0
    error.value = ''
    selectedCategory.value = ''
    rawData = []
  }
})

function close() {
  emit('update:modelValue', false)
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (file) handleFile(file)
}

function handleFile(file) {
  error.value = ''
  fileName.value = file.name
  const ext = file.name.split('.').pop().toLowerCase()

  if (!['xlsx', 'xls', 'json'].includes(ext)) {
    error.value = '不支持该格式，仅支持 Excel (.xlsx/.xls) 和 JSON (.json)'
    preview.value = []
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      if (ext === 'json') {
        const data = JSON.parse(e.target.result)
        // 支持对象数组格式 [{code, name}] 或 二维数组格式
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
          // 对象数组，支持 SZ002865 或 002865 格式
          rawData = data.map(item => {
            const codeRaw = String(item.code || item.股票代码 || '').trim()
            const name = String(item.name || item.股票名称 || '').replace(/\s+/g, '').trim()
            const code = codeRaw.replace(/^(SZ|SH)/, '')
            return { code, name, duplicate: props.existingCodes.includes(code) }
          }).filter(s => /^\d{6}$/.test(s.code))
        } else {
          // 二维数组
          rawData = normalize(data)
        }
      } else {
        // Excel 解析
        try {
          const bytes = new Uint8Array(e.target.result)
          let binaryStr = ''
          for (let i = 0; i < bytes.length; i++) binaryStr += String.fromCharCode(bytes[i])
          const wb = XLSX.read(binaryStr, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const arr = XLSX.utils.sheet_to_json(ws, { header: 1 })
          rawData = fixGBK(arr)
          rawData = normalize(rawData)
        } catch (err) {
          error.value = '解析失败：' + err.message
          preview.value = []
          return
        }
      }
      preview.value = rawData
      validCount.value = rawData.filter(s => !s.duplicate).length
    } catch (err) {
      error.value = '文件解析失败：' + err.message
      preview.value = []
    }
  }
  reader.readAsArrayBuffer(file)
}

// 将 XLSX type:array 解析出的 GBK 乱码字符串还原为正确中文
// XLSX 把 GBK 字节当 UTF-8 解码成了乱码，如 "¾û´ï¹É·Ý"
// 通过重新编码为原始字节，再解码为 GBK
function fixGBK(arr) {
  function decodeCell(cell) {
    if (!cell) return cell
    if (typeof cell === 'object' && 'w' in cell) return fixStr(cell.w)
    if (typeof cell === 'object' && 'v' in cell && typeof cell.v === 'string') return fixStr(cell.v)
    if (typeof cell === 'string') return fixStr(cell)
    return cell
  }

  function fixStr(str) {
    if (!str || typeof str !== 'string') return str
    try {
      const arr2 = []
      for (let i = 0; i < str.length; i++) arr2.push(str.charCodeAt(i))
      const decoded = new TextDecoder('gbk').decode(new Uint8Array(arr2))
      console.log('fixStr sample:', str.slice(0, 20), '-> bytes:', arr2.slice(0, 10), '-> gbK:', decoded.slice(0, 20))
      return decoded
    } catch (e) {
      return str
    }
  }

  return arr.map(row => {
    if (!row) return row
    if (Array.isArray(row)) return row.map(decodeCell)
    return row
  })
}

function normalize(rows) {
  // 支持两种格式：
  // 1. 二维数组：[["SZ002865","钧达股份"], ...]
  // 2. 纯文本行：每行 "SZ002865    钧达股份"（tab或空格分隔）
  const result = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    let code = '', name = ''

    if (typeof row === 'string') {
      // 纯文本行格式: "SZ002865    钧达股份" 或 "SZ002865\t钧达股份"
      const line = row.trim()
      const m = line.match(/^(SZ|SH)?(\d{6})\s+(.+)$/)
      if (m) {
        code = m[2]
        name = m[3].replace(/\s+/g, '').trim() // 去掉名字中的多余空格
      }
    } else if (Array.isArray(row)) {
      // xlsx sheet_to_json 返回 {header:1} 时，第一行是表头，跳过
      const isFirstRowHeader = i === 0 && typeof row[0] === 'string' && !/^(SZ|SH)?\d{6}$/.test(String(row[0]).trim())
      if (isFirstRowHeader) continue
      for (const cell of row) {
        // cell 可能是值，也可能是 XLSX 单元格对象 { v, w, t }
        const rawVal = (cell && typeof cell === 'object') ? (cell.w || cell.v || '') : cell
        const s = String(rawVal || '').trim()
        const m = s.match(/^(SZ|SH)?(\d{6})$/)
        if (m) code = m[2]
        else if (s && /[\u4e00-\u9fa5]/.test(s) && !code) name = s.replace(/\s+/g, '')
        else if (s && code && !name) name = s.replace(/\s+/g, '')
      }
    }

    if (code && name && /^\d{6}$/.test(code)) {
      result.push({ code, name, duplicate: props.existingCodes.includes(code) })
    }
  }
  return result
}

async function doImport() {
  if (!preview.value.length) return
  importing.value = true
  // 动态导入避免循环依赖
  const { useStockStore } = await import('../stores/stockStore.js')
  const { useTagStore } = await import('../stores/tagStore.js')
  const stockStore = useStockStore()
  const tagStore = useTagStore()

  let added = 0
  for (const s of preview.value) {
    if (s.duplicate) continue
    const r = stockStore.addStock({ code: s.code, name: s.name, tags: [], note: '', category: selectedCategory.value })
    if (r !== false) {
      tagStore.incrementCount([])
      added++
    }
  }
  importing.value = false
  alert(`成功导入 ${added} 只股票`)
  close()
}
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 16px; width: 480px; max-width: 95vw; max-height: 80vh; display: flex; flex-direction: column; }
.modal-header { padding: 16px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: #8b949e; font-size: 1.4rem; cursor: pointer; }
.close-btn:hover { color: #e6edf3; }
.modal-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
.hint { font-size: 0.78rem; color: #8b949e; margin-bottom: 8px; line-height: 1.5; }
.hint strong { color: #e6edf3; }
.drop-zone { border: 2px dashed #30363d; border-radius: 10px; padding: 30px; text-align: center; cursor: pointer; color: #8b949e; font-size: 0.85rem; transition: all 0.15s; }
.drop-zone:hover, .drop-zone.dragging { border-color: #58a6ff; color: #58a6ff; }
.error-msg { color: #f85149; font-size: 0.78rem; margin-top: 8px; }
.preview { margin-top: 12px; }
.preview-title { font-size: 0.75rem; color: #8b949e; margin-bottom: 8px; }
.preview-list { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
.preview-item { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; background: #0d1117; border-radius: 6px; padding: 6px 10px; }
.pname { color: #e6edf3; flex: 1; }
.pcode { color: #8b949e; font-family: monospace; }
.dup-tag { font-size: 0.68rem; background: #d2992222; color: #d29922; padding: 1px 6px; border-radius: 4px; }
.form-group { margin-top: 14px; }
.form-group label { font-size: 0.78rem; color: #8b949e; margin-bottom: 6px; display: block; }
.category-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.cat-item { font-size: 0.78rem; padding: 4px 12px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: #8b949e; cursor: pointer; transition: all 0.15s; }
.cat-item:hover { border-color: #58a6ff; color: #e6edf3; }
.cat-item.active { border-color: #f0883e; color: #f0883e; background: #f0883e22; }
.modal-footer { padding: 12px 20px; border-top: 1px solid #30363d; display: flex; justify-content: flex-end; gap: 8px; }
.btn { padding: 8px 20px; border-radius: 8px; border: 1px solid #30363d; background: transparent; color: #e6edf3; font-size: 0.85rem; cursor: pointer; }
.btn.primary { background: #f0883e; border-color: #f0883e; color: #fff; }
.btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
