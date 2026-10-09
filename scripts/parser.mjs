import { createHash } from 'node:crypto'
export function parseChapter(text, path) {
  const number = Number(path.match(/^(\d+)/)?.[1])
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.replace(/^\d+\.\s*/, '')
  if (!number || !title) throw new Error(`章节格式无法识别：${path}`)
  const blocks = [...text.matchAll(/^###\s+(\d+)\.\s+(.+)\r?\n([\s\S]*?)(?=^###\s|$(?![\s\S]))/gm)]
  const entries = blocks.map((m) => {
    const fields = {}
    for (const field of m[3].matchAll(/^-\s*(成本|说人话|收益|证据等级|来源|备注)：([\s\S]*?)(?=^-\s*(?:成本|说人话|收益|证据等级|来源|备注)：|$(?![\s\S]))/gm)) fields[field[1]] = field[2].trim()
    for (const key of ['成本', '说人话', '收益', '证据等级', '来源']) if (!fields[key]) throw new Error(`${path} 第${m[1]}条缺少${key}`)
    const grade = fields['证据等级'].trim().match(/^([ABC])(?:$|[（(])/u)?.[1]
    if (!['A','B','C'].includes(grade)) throw new Error(`${path} 证据等级无法识别：${grade}`)
    const tags = Object.fromEntries([...m[3].matchAll(/(钱|时间|毅力|收益|口径)=(\S+?)(?=\s|-->)/g)].map(x=>[x[1],x[2]]))
    const title = m[2].trim()
    // 按标题识别；编号变化不影响收藏。标题修改时通过新旧数据迁移。
    const id = createHash('sha256').update(title.normalize('NFKC')).digest('hex').slice(0,20)
    return { id, number:Number(m[1]), title, grade, tags, fields }
  })
  if (!entries.length || entries.length !== (text.match(/^###\s/gm)||[]).length) throw new Error(`条目解析不完整：${path}`)
  const numbers = entries.map(x=>x.number)
  if (new Set(numbers).size !== numbers.length) throw new Error(`重复条目编号：${path}`)
  return { number, title, path, entries }
}
