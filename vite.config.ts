import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const attachApiMiddleware = (middlewares: any) => {
  middlewares.use(async (req: any, res: any, next: any) => {
    const rawUrl = req.url || ''
    const pathname = rawUrl.split('?')[0]

    if (!pathname.startsWith('/api/')) {
      next()
      return
    }

    const relative = pathname.replace(/^\/api\//, '')
    const filePath = path.resolve(process.cwd(), 'api', `${relative}.js`)

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: `API route not found: ${pathname}` }))
      return
    }

    try {
      const moduleUrl = `${pathToFileURL(filePath).href}?t=${Date.now()}`
      const mod = await import(moduleUrl)
      const handler = mod?.default

      if (typeof handler !== 'function') {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: `API route has no default handler: ${pathname}` }))
        return
      }

      await handler(req, res)
    } catch (error) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'API bridge failed',
          route: pathname,
        }),
      )
    }
  })
}

const apiDevBridge = () => ({
  name: 'api-dev-bridge',
  configureServer(server: any) {
    attachApiMiddleware(server.middlewares)
  },
  configurePreviewServer(server: any) {
    attachApiMiddleware(server.middlewares)
  },
})

export default defineConfig({
  plugins: [react(), apiDevBridge()],
})
