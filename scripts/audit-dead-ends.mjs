// Static scan for UI dead ends: buttons/links that do nothing, and components
// rendered without a handler they expect. Run: node scripts/audit-dead-ends.mjs
import { parseAst } from 'rolldown/parseAst'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname
const files = []
;(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { if (f !== 'test' && f !== 'qa') walk(p) }
    else if (/\.jsx$/.test(f) && !/\.test\./.test(f)) files.push(p)
  }
})(ROOT)

const lineOf = (code, pos) => code.slice(0, pos).split('\n').length
const tagName = (n) => (n.name.type === 'JSXIdentifier' ? n.name.name : n.name.type === 'JSXMemberExpression' ? '.' : '?')
const attrs = (open) => Object.fromEntries(open.attributes.filter((a) => a.type === 'JSXAttribute').map((a) => [a.name.name, a]))

const findings = { buttonNoHandler: [], submitOutsideForm: [], anchorNoHref: [], emptyHandler: [], missingProps: [], clickableDiv: [] }
const components = {}   // name -> { file, expects:Set(on*), unguarded:Set }
const usages = []       // { comp, file, line, passed:Set, spread }

for (const file of files) {
  const code = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file)
  let ast
  try { ast = parseAst(code, { lang: 'jsx' }) } catch (e) { console.log('PARSE FAIL', rel, e.message); continue }

  // pass 1: component definitions + the on* props they destructure
  for (const node of ast.body) {
    const decl = node.type === 'ExportDefaultDeclaration' ? node.declaration : node.type === 'ExportNamedDeclaration' ? node.declaration : node
    const fn = decl && (decl.type === 'FunctionDeclaration' ? decl : decl.type === 'VariableDeclaration' ? decl.declarations?.[0]?.init : null)
    const id = decl?.id?.name ?? decl?.declarations?.[0]?.id?.name
    if (!fn || !id || !/^[A-Z]/.test(id)) continue
    const param = fn.params?.[0]
    if (param?.type === 'ObjectPattern') {
      const expects = new Set(param.properties.filter((p) => p.key && /^on[A-Z]/.test(p.key.name)).map((p) => p.key.name))
      // unguarded = called as onX( without a preceding "onX &&" / "onX?." / "onX ?" in the source
      const unguarded = new Set([...expects].filter((n) => new RegExp(`(?<![&?.\\w])${n}\\(`).test(code) && !new RegExp(`${n}\\s*(&&|\\?\\.|\\?)`).test(code)))
      components[id] = { file: rel, expects, unguarded }
    }
  }

  // pass 2: walk everything
  const walk = (n, ancestors) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) { n.forEach((c) => walk(c, ancestors)); return }
    if (n.type === 'JSXElement') {
      const open = n.openingElement
      const name = tagName(open)
      const a = attrs(open)
      const line = lineOf(code, open.start)
      if (name === 'button') {
        const type = a.type?.value?.value
        if (!a.onClick && type !== 'submit' && !a.onPointerDown) {
          // a button with no type defaults to submit inside a form
          const inForm = ancestors.some((x) => x.type === 'JSXElement' && tagName(x.openingElement) === 'form' && attrs(x.openingElement).onSubmit)
          if (!inForm) findings.buttonNoHandler.push(`${rel}:${line}`)
        }
        if (type === 'submit') {
          const inForm = ancestors.some((x) => x.type === 'JSXElement' && tagName(x.openingElement) === 'form' && attrs(x.openingElement).onSubmit)
          if (!inForm) findings.submitOutsideForm.push(`${rel}:${line}`)
        }
      }
      if (name === 'a') {
        const href = a.href?.value
        if (!a.href || (href?.type === 'Literal' && (href.value === '#' || href.value === ''))) findings.anchorNoHref.push(`${rel}:${line}`)
      }
      if (a.onClick) {
        const v = a.onClick.value?.expression
        if (v && (v.type === 'ArrowFunctionExpression' || v.type === 'FunctionExpression') && v.body.type === 'BlockStatement' && v.body.body.length === 0) findings.emptyHandler.push(`${rel}:${line}`)
        if (v?.type === 'Identifier' && v.name === 'undefined') findings.emptyHandler.push(`${rel}:${line}`)
        if ((name === 'div' || name === 'span' || name === 'li' || name === 'p') && !a.role && !a.tabIndex) findings.clickableDiv.push(`${rel}:${line}`)
      }
      if (/^[A-Z]/.test(name)) {
        usages.push({ comp: name, file: rel, line, passed: new Set(Object.keys(a)), spread: open.attributes.some((x) => x.type === 'JSXSpreadAttribute') })
      }
    }
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'start' || k === 'end') continue
      const v = n[k]
      if (v && typeof v === 'object') walk(v, n.type === 'JSXElement' ? [...ancestors, n] : ancestors)
    }
  }
  walk(ast, [])
}

for (const u of usages) {
  const c = components[u.comp]
  if (!c || u.spread) continue
  for (const prop of c.expects) {
    if (!u.passed.has(prop)) findings.missingProps.push({ where: `${u.file}:${u.line}`, comp: u.comp, prop, risky: c.unguarded.has(prop) })
  }
}

console.log(`Scanned ${files.length} files, ${Object.keys(components).length} components, ${usages.length} component usages\n`)
for (const k of ['buttonNoHandler', 'submitOutsideForm', 'anchorNoHref', 'emptyHandler']) {
  console.log(`== ${k} (${findings[k].length})`); findings[k].forEach((x) => console.log('  ', x))
}
console.log(`== clickable div/span without role (accessibility) (${findings.clickableDiv.length})`)
findings.clickableDiv.forEach((x) => console.log('  ', x))
const risky = findings.missingProps.filter((m) => m.risky)
const optional = findings.missingProps.filter((m) => !m.risky)
console.log(`== component rendered WITHOUT a handler it calls unguarded (${risky.length})`)
risky.forEach((m) => console.log(`   ${m.where}  <${m.comp}> missing ${m.prop}`))
console.log(`== component rendered without an optional handler (${optional.length})`)
optional.forEach((m) => console.log(`   ${m.where}  <${m.comp}> missing ${m.prop}`))
