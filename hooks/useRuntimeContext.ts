'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RuntimeVariables } from '@/types/prompt'

const LOCATION_CACHE_KEY = 'emotichat.runtime.location'

function formatTimeToMinute(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function detectDeviceInfo(): string {
  if (typeof navigator === 'undefined') return 'Unknown device'
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /mobile|android|iphone|ipad/.test(ua)
  if (navigator.userAgentData?.platform) {
    const platform = navigator.userAgentData.platform
    return `${isMobile ? '移动端' : '桌面端'} · ${platform}`
  }

  if (ua.includes('windows')) return `${isMobile ? '移动端' : '桌面端'} · Windows`
  if (ua.includes('mac')) return `${isMobile ? '移动端' : '桌面端'} · macOS`
  if (ua.includes('android')) return '移动端 · Android'
  if (ua.includes('iphone') || ua.includes('ipad')) return '移动端 · iOS'
  return isMobile ? '移动端 · 未知设备' : '桌面端 · 未知设备'
}

function loadCachedLocation() {
  if (typeof window === 'undefined') return undefined
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY)
    return cached || undefined
  } catch {
    return undefined
  }
}

function cacheLocation(value: string) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, value)
  } catch {
    // ignore
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`
    )
    if (!res.ok) {
      throw new Error('reverse geocode failed')
    }
    const data = await res.json()
    const { city, principalSubdivision } = data
    if (city || principalSubdivision) {
      return [principalSubdivision, city].filter(Boolean).join('·')
    }
  } catch (error) {
    console.warn('[runtime] reverse geocode failed, fallback to coords', error)
  }
  return `${lat.toFixed(3)},${lon.toFixed(3)}`
}

export interface RuntimeContextResult {
  variables: RuntimeVariables
  refreshLocation: () => void
  loadingLocation: boolean
  locationError?: string
}

export function useRuntimeContext(): RuntimeContextResult {
  const [variables, setVariables] = useState<RuntimeVariables>(() => ({
    time: formatTimeToMinute(new Date()),
    location: loadCachedLocation(),
    deviceInfo: detectDeviceInfo(),
  }))
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const timer = setInterval(() => {
      setVariables((prev) => ({ ...prev, time: formatTimeToMinute(new Date()) }))
    }, 15_000)
    return () => clearInterval(timer)
  }, [])

  const refreshLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('当前环境不支持定位')
      return
    }
    setLoadingLocation(true)
    setLocationError(undefined)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const resolved = await reverseGeocode(latitude, longitude)
        cacheLocation(resolved)
        setVariables((prev) => ({ ...prev, location: resolved }))
        setLoadingLocation(false)
      },
      (err) => {
        setLocationError(err.message || '无法获取定位')
        setLoadingLocation(false)
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    if (!variables.location) {
      refreshLocation()
    }
  }, [variables.location, refreshLocation])

  return {
    variables,
    refreshLocation,
    loadingLocation,
    locationError,
  }
}
