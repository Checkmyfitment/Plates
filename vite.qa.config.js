// QA-only dev server: the real app, but signed in as a FAKE user, with every
// write to the database blocked in the browser. Never part of a build.
//   npx vite --config vite.qa.config.js --port 5180   then open /qa.html
import { mergeConfig } from 'vite'
import base from './vite.config.js'
import path from 'node:path'

export default mergeConfig(base, {
  resolve: {
    alias: [{ find: /^.*\/context\/AuthContext(\.jsx)?$/, replacement: path.resolve('src/qa/FakeAuth.jsx') }],
  },
  server: { port: 5180 },
})
