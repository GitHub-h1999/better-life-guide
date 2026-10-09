import test from 'node:test'
import assert from 'node:assert/strict'
import {parseChapter} from './parser.mjs'
const body = '# 1. 测试\n\n### 1. 建议\n<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=大 口径=金钱 -->\n- 成本：零\n- 说人话：结论\n- 收益：数据\n第二行\n- 证据等级：A\n- 来源：https://example.com\n- 备注：限制\n'
test('多行字段与标签保留，编号调整不改变身份',()=>{const a=parseChapter(body,'01-测试.md').entries[0];const b=parseChapter(body.replace('### 1.','### 2.'),'01-测试.md').entries[0];assert.equal(a.fields['收益'],'数据\n第二行');assert.equal(a.tags['钱'],'0');assert.equal(a.id,b.id)})
test('缺字段失败，避免静默发布不完整正文',()=>assert.throws(()=>parseChapter(body.replace('- 来源：https://example.com\n',''),'01-测试.md')))
test('未知证据等级失败',()=>assert.throws(()=>parseChapter(body.replace('证据等级：A','证据等级：D'),'01-测试.md')))
