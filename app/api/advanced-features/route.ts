import { NextRequest, NextResponse } from 'next/server'
import { getAdvancedFeatures, updateAdvancedFeatures } from '@/lib/storage/advanced-features'

export async function GET() {
  try {
    const config = await getAdvancedFeatures()
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('[advanced] failed to load config', error)
    return NextResponse.json({ success: false, error: '加载高级功能配置失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const config = await updateAdvancedFeatures(body)
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('[advanced] failed to save config', error)
    return NextResponse.json({ success: false, error: '保存高级功能配置失败' }, { status: 500 })
  }
}
