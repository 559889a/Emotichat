'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RegexRule } from '@/types/regex'

export function useRegexRules() {
  const [rules, setRules] = useState<RegexRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/regex-rules')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '加载正则规则失败')
      }
      setRules(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载正则规则失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  return { rules, loading, error, refresh: fetchRules, setRules }
}
