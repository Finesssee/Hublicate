'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { appConfig } from '@/config/app.config'

type SandboxInfo = {
  sandboxId?: string
  url?: string
  filesTracked?: string[]
  lastHealthCheck?: string
}

type SandboxStatusResponse = {
  success: boolean
  active: boolean
  healthy: boolean
  sandboxData?: SandboxInfo | null
  message?: string
}

// Community demo grid removed per request

export default function ExploreLibrary() {
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/community-sandboxes')
        const data = await res.json() as { success: boolean; sandboxes: Array<{ sandboxId?: string; url?: string }> }
        if (!mounted) return
        if (data.success && Array.isArray(data.sandboxes)) {
          const list: SandboxInfo[] = data.sandboxes.map(s => ({
            sandboxId: s.sandboxId,
            url: s.url,
          }))
          setSandboxes(list)
        } else {
          setSandboxes([])
        }
      } catch (e) {
        if (!mounted) return
        setError('Failed to load sandbox status')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStatus()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (sandboxes.length === 0) return
    let mounted = true
    const top = sandboxes.slice(0, 9)
    const load = async () => {
      const results = await Promise.allSettled(
        top.map(async (sb) => {
          const id = String(sb.sandboxId || sb.url)
          if (!sb.url) return [id, ''] as const
          try {
            const res = await fetch('/api/scrape-screenshot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: sb.url })
            })
            if (!res.ok) return [id, ''] as const
            const data = await res.json()
            const src: string = data?.screenshot || ''
            return [id, src] as const
          } catch {
            return [id, ''] as const
          }
        })
      )
      if (!mounted) return
      const map: Record<string, string> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const [id, src] = r.value
          if (src) map[id] = src
        }
      }
      setPreviews(map)
    }
    load()
    return () => { mounted = false }
  }, [sandboxes])

  return (
    <div className="w-full bg-card/70 backdrop-blur-sm border-b border-border">
      <div className="px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Workspace</h3>
          <div className="text-xs text-muted-foreground">Discover and open sandboxed apps</div>
        </div>

        {/* Community Sandboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && (
            <div className="text-xs text-muted-foreground">Loading community sandboxes…</div>
          )}
          {!loading && sandboxes.length === 0 && (
            <div className="text-xs text-muted-foreground">No community sandboxes found.</div>
          )}
          {sandboxes.slice(0, 9).map((sb) => (
            <div key={sb.sandboxId || sb.url} className="rounded-md border border-border bg-white overflow-hidden">
              <div className="aspect-[16/9] bg-muted">
                {(() => {
                  const id = String(sb.sandboxId || sb.url)
                  const src = previews[id]
                  if (src) {
                    return (
                      <img
                        src={src}
                        alt={sb.sandboxId || 'Sandbox'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )
                  }
                  return <div className="w-full h-full bg-gray-100" />
                })()}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{sb.sandboxId || 'Sandbox'}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">{sb.url}</div>
                </div>
                <div className="flex items-center gap-2">
                  {(sb.sandboxId || sb.url) && (
                    <Button asChild size="sm" variant="secondary" className="h-8 px-3">
                      <a
                        href={`/?remix=1&sandbox=${encodeURIComponent(
                          sb.sandboxId || (sb.url ? (sb.url.match(/https?:\/\/(?:\d+-)?([a-z0-9]+)\.e2b\.app/i)?.[1] ?? '') : '')
                        )}&model=${encodeURIComponent(appConfig.ai.defaultModel)}`}
                      >
                        Remix
                      </a>
                    </Button>
                  )}
                  {sb.url && (
                    <Button asChild size="sm" className="h-8 px-3">
                      <a href={sb.url} target="_blank" rel="noopener noreferrer">Open</a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* End community sandboxes */}
      </div>
    </div>
  )
}


