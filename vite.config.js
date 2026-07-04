import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readConfig, handleRequest, streamGenerate } from './server/graniteProxy.js'

// Mounts the Granite proxy inside the dev server: same origin (no CORS),
// credentials stay in this Node process. `env` is loaded with an empty prefix
// so non-VITE_ vars (WATSONX_*) are available server-side.
function graniteDevServer(env) {
  const cfg = readConfig(env)
  return {
    name: 'granite-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/granite', (req, res) => {
        let raw = ''
        req.on('data', (c) => (raw += c))
        req.on('end', async () => {
          let body
          try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }
          const pathname = (req.originalUrl || req.url || '').split('?')[0]
          if (pathname.endsWith('/generate_stream')) {
            if (!readConfig(env).apiKey) { res.statusCode = 503; res.end('{"error":"not_configured"}'); return }
            try {
              const upstream = await streamGenerate(body, { cfg })
              res.statusCode = upstream.status
              res.setHeader('Content-Type', 'text/event-stream')
              res.setHeader('Cache-Control', 'no-cache')
              const reader = upstream.body.getReader()
              const pump = async () => {
                const { done, value } = await reader.read()
                if (done) { res.end(); return }
                res.write(Buffer.from(value))
                pump().catch(() => res.end())
              }
              pump().catch(() => res.end())
            } catch (e) { res.statusCode = 502; res.end(JSON.stringify({ error: String(e?.message || e) })) }
            return
          }
          const { status, body: out } = await handleRequest(pathname, body, { cfg })
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(out))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), tailwindcss(), graniteDevServer(env)] }
})
