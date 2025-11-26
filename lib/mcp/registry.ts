export interface McpPingResult {
  ok: boolean
  latency?: number
  error?: string
}

export async function pingMcpServer(endpoint: string): Promise<McpPingResult> {
  const started = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(endpoint, { method: 'HEAD', signal: controller.signal })
    clearTimeout(timer)
    return {
      ok: res.ok,
      latency: Date.now() - started,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Ping failed',
    }
  }
}
