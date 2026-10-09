<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import data from './data/content.json'
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
const expanded = ref(new Set<string>())
const copied = ref('')
const shareError = ref(false)
const resumeId = progress.value
const last = computed(()=>all.find(e=>e.id===resumeId))
const visibleLimit = ref(20)
watch([query, selected, view, grade, free], ()=>{visibleLimit.value=20})
const filtered = computed(()=>all.filter(e=>(!selected.value || e.chapter===selected.value) && (view.value!=='saved'||bookmarks.value.includes(e.id)) && (!grade.value||e.grade===grade.value) && (!free.value||e.tags['钱']==='0') && (!query.value.trim()||[e.title,e.chapterTitle,...Object.values(e.fields)].join(' ').toLowerCase().includes(query.value.trim().toLowerCase()))))
const groups = computed(()=>chapters.map(c=>({...c, items:filtered.value.slice(0,visibleLimit.value).filter(e=>e.chapter===c.number)})).filter(c=>c.items.length))
const currentTitle = computed(()=>view.value==='saved'?'我的收藏':selected.value?chapters.find(c=>c.number===selected.value)?.title:'探索指南')
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
onMounted(()=>{observe();const hash=location.hash.slice(1);if(hash)void jumpTo(migrate(hash));window.addEventListener('hashchange',handleHash)})
function handleHash(){void jumpTo(migrate(location.hash.slice(1)))}
onBeforeUnmount(()=>{observer?.disconnect();window.removeEventListener('hashchange',handleHash)})
const sourceUrl = (path:string, number:number) => `${data.source}/blob/${data.revision}/book/${encodeURIComponent(path)}#:~:text=${number}.`
</script>

<template>
  <div class="app-shell">
    <div v-if="menu" class="scrim" @click="menu=false"></div>
    <aside class="sidebar" :class="{open:menu}" aria-label="章节导航">
      <a class="brand" href="#" @click.prevent="navigate()"><span class="brand-mark">生</span><span>好好生活<small>BETTER LIFE GUIDE</small></span></a>
      <button class="mobile-close" @click="menu=false" aria-label="关闭目录">×</button>
      <nav class="primary-nav"><button :class="{active:view==='browse'&&!selected}" @click="navigate()"><span>◎</span> 探索指南</button><button :class="{active:view==='saved'}" @click="navigate(0,'saved')"><span>☆</span> 我的收藏 <small>{{savedCount}}</small></button></nav>
      <div class="nav-label">生活的不同侧面 <span>{{chapters.length}}</span></div>
      <nav class="chapter-nav"><button v-for="c in chapters" :key="c.number" :class="{active:selected===c.number&&view==='browse'}" @click="navigate(c.number)"><span class="chapter-number">{{String(c.number).padStart(2,'0')}}</span><span>{{c.title}}</span><small>{{c.entries.length}}</small></button></nav>
      <div class="sidebar-bottom"><span class="status-dot"></span> 内容自动同步 <a :href="data.source" target="_blank" rel="noopener noreferrer">原书 ↗</a></div>
    </aside>
    <div class="page">
      <header class="topbar"><div class="mobile-brand"><button @click="menu=true" aria-label="打开目录">☰</button><span>好好生活</span></div><span class="desktop-breadcrumb">生活指南 <span>/</span> {{currentTitle}}</span><label class="search"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="搜索你关心的生活问题" aria-label="搜索指南"></label><button class="theme-button" @click="theme=theme==='dark'?'light':'dark'" :aria-label="theme==='dark'?'切换浅色主题':'切换深色主题'">{{theme==='dark'?'☀':'☾'}}</button></header>
      <main>
        <section v-if="!selected&&view==='browse'&&!query" class="hero">
          <div class="hero-copy"><div class="eyebrow"><span></span> 用更少的成本，过更好的生活</div><h1>把生活，<br>慢慢过好<span>。</span></h1><p>关于健康、时间、金钱与自由的 {{data.total}} 条建议。<br>不必全部做到，从与你有关的一条开始。</p><div class="hero-actions"><button class="primary-button" @click="navigate(1)">开始阅读 <span>↗</span></button><button v-if="last" class="text-button" @click="jumpTo(last.id)">继续上次阅读 →</button></div></div>
          <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-sun"></div><div class="art-stem"></div><div class="art-leaf leaf-one"></div><div class="art-leaf leaf-two"></div><div class="art-leaf leaf-three"></div><span class="art-caption">A LITTLE BETTER, EVERY DAY.</span><span class="art-note">一步一步，也很好。</span></div>
        </section>
        <section v-if="!selected&&view==='browse'&&!query" class="topic-grid" aria-label="快捷主题"><button @click="navigate(2)"><span class="topic-icon peach">◌</span><div>照顾身体<small>睡眠、运动与饮食</small></div><span class="arrow">↗</span></button><button @click="navigate(4)"><span class="topic-icon lilac">◷</span><div>留住时间<small>专注与减少消耗</small></div><span class="arrow">↗</span></button><button @click="navigate(5)"><span class="topic-icon mint">◇</span><div>把钱花好<small>少花一些冤枉钱</small></div><span class="arrow">↗</span></button></section>
        <div class="list-heading"><div><div class="eyebrow">{{view==='saved'?'YOUR COLLECTION':'THE GUIDE'}}</div><h2>{{currentTitle}}</h2></div><span>{{filtered.length}} 条建议</span></div>
        <div class="filters"><button :class="{selected:!grade&&!free}" @click="grade='';free=false">全部建议</button><button :class="{selected:grade==='A'}" @click="grade=grade==='A'?'':'A'">A 级证据</button><button :class="{selected:free}" @click="free=!free">不花钱</button><button v-if="selected||query||grade||free" class="reset" @click="resetFilters">清除筛选</button><details class="grade-help"><summary>如何理解证据等级？</summary><p>等级沿用原书标注。A、B、C 反映来源证据的不同强度，不代表建议适合所有人。请结合原文备注、适用条件和来源阅读。</p></details></div>
        <div v-if="storageWarning" role="status" class="notice">浏览器无法保存数据，收藏和进度可能在关闭页面后丢失。</div>
        <div v-if="shareError" role="status" class="notice">复制未成功，地址栏已更新为条目链接，可以手动复制。</div>
        <div v-if="view==='saved'&&retired" class="notice">{{retired}} 条收藏在当前原书中未找到，记录仍保留，未绑定到其他建议。</div>
        <div v-if="!filtered.length" class="empty"><span>⌕</span><h3>{{view==='saved'&&!savedCount?'把有用的建议，留在这里':'没有找到相关建议'}}</h3><p>{{view==='saved'&&!savedCount?'点击条目右上角的星标，下次就能快速找回。':'试试其他关键词，或清除筛选条件。'}}</p><button class="primary-button" @click="view==='saved'&&!savedCount?navigate():resetFilters()">{{view==='saved'&&!savedCount?'去探索指南':'清除筛选'}}</button></div>
        <section v-for="group in groups" :key="group.number" class="chapter-group"><div class="group-heading"><span>{{String(group.number).padStart(2,'0')}}</span><h3>{{group.title}}</h3><small>{{group.items.length}} 条</small></div>
          <article v-for="e in group.items" :id="e.id" :key="e.id" class="reading-card">
            <div class="card-top"><span class="card-kicker">{{e.chapterTitle}} · {{String(e.number).padStart(2,'0')}}</span><button class="bookmark" :class="{marked:bookmarks.includes(e.id)}" :aria-label="bookmarks.includes(e.id)?'取消收藏：'+e.title:'收藏：'+e.title" :aria-pressed="bookmarks.includes(e.id)" @click="toggleSaved(e.id)">{{bookmarks.includes(e.id)?'★':'☆'}}</button></div>
            <h3>{{e.title}}</h3><div class="card-tags"><span class="grade" :class="'grade-'+e.grade">{{e.fields['证据等级']}} 级证据</span><span v-if="e.tags['钱']==='0'">不花钱</span><span v-if="e.tags['时间']==='少'">少量时间</span></div>
            <div class="plain-text markdown" v-html="markdown(e.fields['说人话'])"></div>
            <div v-if="e.fields['备注']" class="important-note"><span>阅读提示</span><div class="markdown" v-html="markdown(e.fields['备注'])"></div></div>
            <div v-if="expanded.has(e.id)" :id="'detail-'+e.id" class="entry-details"><div v-for="field in ['成本','收益','来源']" :key="field"><h4>{{field==='收益'?'研究与原文数据':field}}</h4><div class="markdown" v-html="markdown((e.fields as Record<string,string>)[field]||'')"></div></div><a :href="sourceUrl(e.path,e.number)" target="_blank" rel="noopener noreferrer">查看该版本原文 ↗</a></div>
            <div class="card-footer"><button @click="toggleDetails(e.id)" :aria-expanded="expanded.has(e.id)" :aria-controls="'detail-'+e.id">{{expanded.has(e.id)?'收起详情 −':'成本、数据与来源 ＋'}}</button><button @click="share(e.id)" :aria-label="'复制链接：'+e.title">{{copied===e.id?'已复制 ✓':'分享 ↗'}}</button></div>
          </article>
        </section>
        <div v-if="filtered.length>visibleLimit" class="load-more"><button class="primary-button" @click="visibleLimit+=20">再读 20 条 ↓</button><span>已展示 {{Math.min(visibleLimit,filtered.length)}} / {{filtered.length}} 条</span></div>
        <footer class="page-footer"><div class="footer-title">好好生活 <span>不用一次做到全部。</span></div><p>内容摘录自 <a :href="data.source" target="_blank" rel="noopener noreferrer">《高性价比人生指南》↗</a>，由原作者维护。本网站调整展示形式，正文保留原文。</p><p>正文采用 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · {{chapters.length}} 章 / {{data.total}} 条 · 内容版本 {{data.revision.slice(0,7)}} · {{data.updatedAt.slice(0,10)}}</p><p>收藏和阅读进度保存在当前浏览器，清除网站数据会丢失；暂不支持跨设备同步。</p></footer>
      </main>
      <nav class="mobile-nav" aria-label="移动端导航"><button :class="{active:view==='browse'}" @click="navigate()">◎<span>探索</span></button><button @click="menu=true">☷<span>目录</span></button><button :class="{active:view==='saved'}" @click="navigate(0,'saved')">☆<span>收藏</span></button><button :disabled="!last" @click="last&&jumpTo(last.id)">◷<span>继续读</span></button></nav>
    </div>
  </div>
</template>
