import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseChapter } from './parser.mjs'
const url = 'https://github.com/eternity4719/HowToLiveBetter'
const repo = resolve(process.env.UPSTREAM_DIR || '.upstream')
if (!existsSync(repo)) execFileSync('git',['clone','--depth','1',url+'.git',repo],{stdio:'inherit'})
else if (!process.env.UPSTREAM_DIR) { execFileSync('git',['-C',repo,'fetch','--depth','1','origin','main'],{stdio:'inherit'}); execFileSync('git',['-C',repo,'reset','--hard','FETCH_HEAD'],{stdio:'inherit'}) }
const files = readdirSync(resolve(repo,'book')).filter(x=>/^\d{2}-.*\.md$/.test(x)).sort()
const chapters = files.map(path=>parseChapter(readFileSync(resolve(repo,'book',path),'utf8'),path))
if (!chapters.length) throw new Error('没有找到章节')
const entries = chapters.flatMap(x=>x.entries)
if (new Set(entries.map(x=>x.id)).size !== entries.length) throw new Error('条目标题重复，需要调整身份策略；中止同步')
const dest = resolve('src/data/content.json')
const previous = existsSync(dest) ? JSON.parse(readFileSync(dest,'utf8')) : null
if (previous && entries.length < previous.total * .9) throw new Error('条目数下降超过10%，请核对上游变更后再同步')
const migrations = {...previous?.migrations}
// 只有同章节、正文完全一致的唯一匹配才迁移标题变更，避免错绑收藏。
if(previous) for(const old of previous.chapters.flatMap(c=>c.entries.map(e=>({...e,chapter:c.number})))) {
  if(entries.some(e=>e.id===old.id)) continue
  const matches=chapters.filter(c=>c.number===old.chapter).flatMap(c=>c.entries).filter(e=>JSON.stringify(e.fields)===JSON.stringify(old.fields))
  if(matches.length===1) migrations[old.id]=matches[0].id
}
const revision=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim()
const updatedAt=execFileSync('git',['-C',repo,'show','-s','--format=%cI','HEAD'],{encoding:'utf8'}).trim()
const license=readFileSync(resolve(repo,'LICENSE'),'utf8')
if(!license.includes('Attribution 4.0') && !license.includes('CC BY 4.0')) throw new Error('上游许可证发生变化，请人工核实')
const data={source:url,revision,updatedAt,total:entries.length,license:'CC BY 4.0',migrations,chapters}
mkdirSync(resolve('src/data'),{recursive:true})
writeFileSync(dest+'.tmp',JSON.stringify(data,null,2)+'\n');renameSync(dest+'.tmp',dest)
mkdirSync('docs',{recursive:true});writeFileSync('docs/CONTENT-LICENSE.txt',license)
console.log(`同步完成：${chapters.length}章，${entries.length}条，上游 ${revision.slice(0,7)}`)
