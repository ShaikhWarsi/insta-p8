const ts = require('typescript')
const fs = require('node:fs')
const assert = require('node:assert/strict')

function load(path) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('exports', 'require', 'module', code)(module.exports, require, module)
  return module.exports
}

async function main() {
  const ig = load('lib/instagram-api.ts')
  global.fetch = async (_, options) => {
    assert.ok(options.signal instanceof AbortSignal)
    assert.equal(JSON.parse(options.body).message.text, 'hello')
    return { ok: true, json: async () => ({ message_id: 'test' }) }
  }
  assert.deepEqual(await ig.sendTextDM('fake', { id: '123' }, 'hello'), { ok: true, id: 'test' })
  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) })
  assert.equal((await ig.sendTextDM('fake', { id: '123' }, 'hello')).ok, false)
  const ai = load('lib/ai-reply.ts')
  global.fetch = async (_, options) => {
    assert.ok(options.signal instanceof AbortSignal)
    return { ok: true, json: async () => ({ choices: [{ message: { content: ' reply ' } }] }) }
  }
  assert.equal(await ai.generateAIReply('hello', '', [], 'fake'), 'reply')
  global.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError') }
  assert.equal((await ig.sendTextDM('fake', { id: '123' }, 'hello')).ok, false)
  assert.equal(await ai.generateAIReply('hello', '', [], 'fake'), null)
  console.log('PASS: send success, HTTP failure, timeout handling, AI reply and timeout signals')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
