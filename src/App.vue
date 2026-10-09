<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import data from './data/content.json'
import UiIcon from './components/UiIcon.vue'
const chapters = data.chapters
const all = chapters.flatMap(c => c.entries.map(e => ({ ...e, chapter: c.number, chapterTitle: c.title, path: c.path })))
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback } }
function save(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { storageWarning.value = true } }
const storageWarning = ref(false)
const validIds = new Set(all.map(e => e.id))
const migrations = data.migrations as Record<string,string>
function migrate(id:string) { const seen = new Set<string>(); while(migrations[id] && !seen.has(id)) { seen.add(id); id=migrations[id] } return id }
const saved = read<unknown>('blg-saved', [])
const bookmarks = ref<string[]>(Array.isArray(saved) ? [...new Set(saved.filter(x=>typeof x==='string').map(migrate))] : [])
const retired = computed(()=>bookmarks.value.filter(id=>!validIds.has(id)).length)
const savedCount = computed(()=>bookmarks.value.filter(id=>validIds.has(id)).length)
const progress = ref<string>(typeof read('blg-progress','') === 'string' ? migrate(read('blg-progress','')) : '')
const theme = ref(read('blg-theme', '') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
const query = ref('')
const selected = ref(0)
const view = ref<'browse'|'saved'>('browse')
const grade = ref('')
const free = ref(false)
const menu = ref(false)
const appearanceOpen = ref(false)
const availableStyles = [{ id: 'paper', name: '留白', description: '安静、清晰，适合长时间阅读' }]
const readingStyle = ref(availableStyles.some(s => s.id === read('blg-style', 'paper')) ? read('blg-style', 'paper') : 'paper')
watch(readingStyle, value => { document.documentElement.dataset.style = value; save('blg-style', value) }, { immediate: true })
function closePanels(event: KeyboardEvent) { if (event.key === 'Escape') { menu.value = false; appearanceOpen.value = false } }
const expanded = ref(new Set<string>())
const copied = ref('')
const shareError = ref(false)
const resumeId = progress.value
const last = computed(()=>all.find(e=>e.id===resumeId))
const visibleLimit = ref(20)
watch([query, selected, view, grade, free], ()=>{visibleLimit.value=20})
const filtered = computed(()=>all.filter(e=>(!selected.value || e.chapter===selected.value) && (view.value!=='saved'||bookmarks.value.includes(e.id)) && (!grade.value||e.grade===grade.value) && (!free.value||e.tags['钱']==='0') && (!query.value.trim()||[e.title,e.chapterTitle,...Object.values(e.fields)].join(' ').toLowerCase().includes(query.value.trim().toLowerCase()))))
const groups = computed(()=>chapters.map(c=>({...c, items:filtered.value.slice(0,visibleLimit.value).filter(e=>e.chapter===c.number)})).filter(c=>c.items.length))
const currentTitle = computed(()=>view.value==='saved'?'我的收藏':selected.value?chapters.find(c=>c.number===selected.value)?.title:'全部建议')
const markdown = (s:string) => DOMPurify.sanitize(marked.parse(s, { async:false }) as string)
function toggleSaved(id:string) { bookmarks.value=bookmarks.value.includes(id)?bookmarks.value.filter(x=>x!==id):[...bookmarks.value,id] }
function toggleDetails(id:string) { const set=new Set(expanded.value);set.has(id)?set.delete(id):set.add(id);expanded.value=set }
function navigate(section=0, mode:'browse'|'saved'='browse') { selected.value=section;view.value=mode;query.value='';menu.value=false;window.scrollTo({top:0,behavior:'smooth'}) }
function resetFilters() {query.value='';selected.value=0;grade.value='';free.value=false}
async function jumpTo(id:string) { const entry=all.find(e=>e.id===id);if(!entry)return;resetFilters();view.value='browse';selected.value=entry.chapter;menu.value=false;await nextTick();visibleLimit.value=Math.max(20,filtered.value.findIndex(e=>e.id===id)+1);await nextTick();document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});progress.value=id }
async function share(id:string) { const url=new URL(location.href);url.hash=id;try {await navigator.clipboard.writeText(url.href);copied.value=id;shareError.value=false;setTimeout(()=>copied.value='',1800)} catch {shareError.value=true;history.replaceState(null,'',url)} }
watch(bookmarks,v=>save('blg-saved',v),{deep:true})
watch(progress,v=>save('blg-progress',v))
watch(theme,v=>{document.documentElement.dataset.theme=v;save('blg-theme',v)},{immediate:true})
let observer:IntersectionObserver|undefined
function observe() { observer?.disconnect();observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0]) progress.value=visible[0].target.id},{rootMargin:'-90px 0px -60% 0px'});document.querySelectorAll('article.reading-card').forEach(el=>observer?.observe(el)) }
watch([filtered, visibleLimit],()=>nextTick(observe))
onMounted(()=>{observe();const hash=location.hash.slice(1);if(hash)void jumpTo(migrate(hash));window.addEventListener('hashchange',handleHash);window.addEventListener('keydown',closePanels)})
function handleHash(){void jumpTo(migrate(location.hash.slice(1)))}
onBeforeUnmount(()=>{observer?.disconnect();window.removeEventListener('hashchange',handleHash);window.removeEventListener('keydown',closePanels)})
const sourceUrl = (path:string, number:number) => `${data.source}/blob/${data.revision}/book/${encodeURIComponent(path)}#:~:text=${number}.`
</script>

<template>
  <div class="app-shell">
    <div v-if="menu" class="scrim" @click="menu = false"></div>
    <aside class="sidebar" :class="{ open: menu }" aria-label="章节导航">
      <a class="brand" href="#" @click.prevent="navigate()">
        <span class="brand-symbol"><UiIcon name="book" :size="25" /></span>
        <span>好好生活<small>一份值得慢慢读的生活指南</small></span>
      </a>
      <button class="mobile-close icon-button" @click="menu = false" aria-label="关闭目录"><UiIcon name="close" /></button>
      <nav class="primary-nav">
        <button :class="{ active: view === 'browse' && !selected }" @click="navigate()"><UiIcon name="grid" :size="18" /><span>探索指南</span></button>
        <button :class="{ active: view === 'saved' }" @click="navigate(0, 'saved')"><UiIcon name="bookmark" :size="18" /><span>我的收藏</span><small>{{ savedCount }}</small></button>
      </nav>
      <div class="nav-label">章节目录 <span>{{ chapters.length }} 章</span></div>
      <nav class="chapter-nav">
        <button v-for="c in chapters" :key="c.number" :class="{ active: selected === c.number && view === 'browse' }" @click="navigate(c.number)">
          <span class="chapter-number">{{ String(c.number).padStart(2, '0') }}</span><span>{{ c.title }}</span><small>{{ c.entries.length }}</small>
        </button>
      </nav>
      <div class="sidebar-bottom"><span class="status-dot"></span> 与原书保持同步 <a :href="data.source" target="_blank" rel="noopener noreferrer" aria-label="打开原书仓库"><UiIcon name="external" :size="14" /></a></div>
    </aside>

    <div class="page">
      <header class="topbar">
        <div class="mobile-brand"><button class="icon-button" @click="menu = true" aria-label="打开目录"><UiIcon name="menu" /></button><span>好好生活</span></div>
        <div class="desktop-breadcrumb"><span>阅读室</span><span class="breadcrumb-separator">/</span>{{ view === 'browse' && !selected ? '探索指南' : currentTitle }}</div>
        <label class="search"><UiIcon name="search" :size="17" /><input v-model="query" type="search" placeholder="搜索一个生活问题…" aria-label="搜索指南" /></label>
        <div class="appearance">
          <button class="icon-button appearance-trigger" :aria-expanded="appearanceOpen" aria-controls="appearance-panel" @click="appearanceOpen = !appearanceOpen" aria-label="阅读外观"><UiIcon name="settings" :size="19" /></button>
          <div v-if="appearanceOpen" class="appearance-dismiss" @click="appearanceOpen = false"></div>
          <section v-if="appearanceOpen" id="appearance-panel" class="appearance-panel" aria-label="阅读外观设置">
            <div class="appearance-heading">阅读外观 <button class="icon-button" @click="appearanceOpen = false" aria-label="关闭外观设置"><UiIcon name="close" :size="16" /></button></div>
            <p class="setting-label">界面风格</p>
            <button v-for="style in availableStyles" :key="style.id" class="style-choice" :class="{ selected: readingStyle === style.id }" :aria-pressed="readingStyle === style.id" @click="readingStyle = style.id"><span class="style-swatch"><i></i><i></i><i></i></span><span>{{ style.name }}<small>{{ style.description }}</small></span><UiIcon v-if="readingStyle === style.id" name="check" :size="17" /></button>
            <p class="setting-label">显示模式</p>
            <div class="theme-options"><button :class="{ selected: theme === 'light' }" :aria-pressed="theme === 'light'" @click="theme = 'light'"><UiIcon name="sun" :size="17" />浅色</button><button :class="{ selected: theme === 'dark' }" :aria-pressed="theme === 'dark'" @click="theme = 'dark'"><UiIcon name="moon" :size="17" />深色</button></div>
          </section>
        </div>
      </header>

      <main>
        <section v-if="!selected && view === 'browse' && !query" class="hero">
          <div class="hero-copy">
            <div class="eyebrow"><span class="eyebrow-line"></span> 高性价比人生指南</div>
            <h1>把生活，<br />过得轻一点<span class="hero-period">。</span></h1>
            <p>少一点消耗，多一点从容。<br />从健康、时间、金钱与自由中，找到与你有关的答案。</p>
            <div class="hero-actions"><button class="primary-button" @click="navigate(1)">从第一章开始 <UiIcon name="arrow" :size="17" /></button><button v-if="last" class="text-button" @click="jumpTo(last.id)"><UiIcon name="clock" :size="16" />继续上次阅读</button></div>
          </div>
          <div class="hero-index">
            <div class="index-heading"><span>从你关心的事开始</span><span class="index-marker">01 — 34</span></div>
            <button @click="navigate(2)"><span class="index-number">01</span><span>照顾好身体<small>睡眠、运动与日常饮食</small></span><UiIcon name="external" :size="18" /></button>
            <button @click="navigate(4)"><span class="index-number">02</span><span>把时间留给自己<small>减少消耗，找回专注</small></span><UiIcon name="external" :size="18" /></button>
            <button @click="navigate(5)"><span class="index-number">03</span><span>让钱花得值得<small>少花一些冤枉钱</small></span><UiIcon name="external" :size="18" /></button>
            <div class="index-footer">{{ chapters.length }} 个章节<span>·</span>{{ data.total }} 条建议<span>·</span>不必全部做到</div>
          </div>
        </section>

        <section class="reader-section" aria-label="建议列表">
          <div class="list-heading"><div><span class="section-label">{{ view === 'saved' ? '留给未来的自己' : selected ? 'CHAPTER ' + String(selected).padStart(2, '0') : '阅读，从这里开始' }}</span><h2>{{ currentTitle }}</h2></div><span class="result-count">{{ filtered.length }} <small>条建议</small></span></div>
          <div class="filters"><div class="filter-options"><button :class="{ selected: !grade && !free }" @click="grade = ''; free = false">全部</button><button :class="{ selected: grade === 'A' }" @click="grade = grade === 'A' ? '' : 'A'">A 级证据</button><button :class="{ selected: free }" @click="free = !free">不花钱</button></div><button v-if="selected || query || grade || free" class="reset" @click="resetFilters">清除筛选</button><details class="grade-help"><summary>关于证据等级 <UiIcon name="down" :size="12" /></summary><p>等级沿用原书标注。A、B、C 反映来源证据的不同强度，不代表建议适合所有人。请结合原文备注、适用条件和来源阅读。</p></details></div>
          <div v-if="storageWarning" role="status" class="notice">浏览器无法保存数据，收藏和进度可能在关闭页面后丢失。</div>
          <div v-if="shareError" role="status" class="notice">复制未成功，地址栏已更新为条目链接，可以手动复制。</div>
          <div v-if="view === 'saved' && retired" class="notice">{{ retired }} 条收藏在当前原书中未找到，记录仍保留，未绑定到其他建议。</div>
          <div v-if="!filtered.length" class="empty"><UiIcon :name="view === 'saved' ? 'bookmark' : 'search'" :size="32" /><h3>{{ view === 'saved' && !savedCount ? '把有用的建议，留在这里' : '暂时没有找到相关建议' }}</h3><p>{{ view === 'saved' && !savedCount ? '遇到想记住的一条，点一下收藏。' : '换一个关键词，或试着放宽筛选条件。' }}</p><button class="text-button" @click="view === 'saved' && !savedCount ? navigate() : resetFilters()">{{ view === 'saved' && !savedCount ? '去探索指南' : '清除筛选' }}<UiIcon name="arrow" :size="16" /></button></div>
          <section v-for="group in groups" :key="group.number" class="chapter-group">
            <div class="group-heading"><span>{{ String(group.number).padStart(2, '0') }}</span><h3>{{ group.title }}</h3><span class="group-rule"></span></div>
            <article v-for="e in group.items" :id="e.id" :key="e.id" class="reading-card">
              <div class="entry-number" aria-hidden="true">{{ String(e.number).padStart(2, '0') }}</div>
              <div class="entry-body">
                <div class="card-top"><div class="card-tags"><span class="grade" :class="'grade-' + e.grade"><i></i>{{ e.fields['证据等级'] }} 级证据</span><span v-if="e.tags['钱'] === '0'">不花钱</span><span v-if="e.tags['时间'] === '少'">少量时间</span></div><button class="bookmark icon-button" :class="{ marked: bookmarks.includes(e.id) }" :aria-label="bookmarks.includes(e.id) ? '取消收藏：' + e.title : '收藏：' + e.title" :aria-pressed="bookmarks.includes(e.id)" @click="toggleSaved(e.id)"><UiIcon name="bookmark" :size="19" /></button></div>
                <h3>{{ e.title }}</h3>
                <div class="plain-text markdown" v-html="markdown(e.fields['说人话'])"></div>
                <div v-if="e.fields['备注']" class="important-note"><span>阅读提示</span><div class="markdown" v-html="markdown(e.fields['备注'])"></div></div>
                <div v-if="expanded.has(e.id)" :id="'detail-' + e.id" class="entry-details"><div v-for="field in ['成本', '收益', '来源']" :key="field"><h4>{{ field === '收益' ? '研究与原文数据' : field }}</h4><div class="markdown" v-html="markdown((e.fields as Record<string, string>)[field] || '')"></div></div><a :href="sourceUrl(e.path, e.number)" target="_blank" rel="noopener noreferrer">查看该版本原文 <UiIcon name="external" :size="13" /></a></div>
                <div class="card-footer"><button @click="toggleDetails(e.id)" :aria-expanded="expanded.has(e.id)" :aria-controls="'detail-' + e.id"><UiIcon :name="expanded.has(e.id) ? 'minus' : 'plus'" :size="14" />{{ expanded.has(e.id) ? '收起详情' : '成本、数据与来源' }}</button><button @click="share(e.id)" :aria-label="'复制链接：' + e.title"><UiIcon :name="copied === e.id ? 'check' : 'share'" :size="15" />{{ copied === e.id ? '已复制' : '分享' }}</button></div>
              </div>
            </article>
          </section>
          <div v-if="filtered.length > visibleLimit" class="load-more"><button class="outline-button" @click="visibleLimit += 20">再读 20 条 <UiIcon name="down" :size="16" /></button><span>{{ Math.min(visibleLimit, filtered.length) }} / {{ filtered.length }}</span></div>
        </section>

        <footer class="page-footer"><div class="footer-title">好好生活<span>不用一次做到全部。</span></div><p>内容来自 <a :href="data.source" target="_blank" rel="noopener noreferrer">《高性价比人生指南》</a>，由原作者维护。本网站调整展示形式，保留原文。</p><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a><span class="footer-divider">/</span>{{ chapters.length }} 章 · {{ data.total }} 条<span class="footer-divider">/</span>{{ data.updatedAt.slice(0, 10) }} · {{ data.revision.slice(0, 7) }}</p><p>收藏与阅读进度保存在当前浏览器，暂不支持跨设备同步。</p></footer>
      </main>
      <nav class="mobile-nav" aria-label="移动端导航"><button :class="{ active: view === 'browse' }" @click="navigate()"><UiIcon name="grid" :size="20" /><span>探索</span></button><button @click="menu = true"><UiIcon name="book" :size="20" /><span>目录</span></button><button :class="{ active: view === 'saved' }" @click="navigate(0, 'saved')"><UiIcon name="bookmark" :size="20" /><span>收藏</span></button><button :disabled="!last" @click="last && jumpTo(last.id)"><UiIcon name="clock" :size="20" /><span>继续读</span></button></nav>
    </div>
  </div>
</template>
