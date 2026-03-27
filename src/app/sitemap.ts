import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/admin'
import { BASE_URL } from '@/lib/constants'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = BASE_URL

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/recruit`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/project/quick-post`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/policy/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // 동적 페이지 (DB에서 가져오기)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return staticPages

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    // 프로젝트 (공개, 최근 1000개)
    const { data: projects } = await supabase
      .from('Project')
      .select('project_id, updated_at')
      .eq('visibility', 'public')
      .order('updated_at', { ascending: false })
      .limit(1000)

    const projectPages: MetadataRoute.Sitemap = (projects || []).map((p) => ({
      url: `${baseUrl}/project/${p.project_id}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    // 채용/공모전 (승인+활성, 최근 500개)
    const { data: recruitItems } = await supabase
      .from('recruit_items')
      .select('id, created_at')
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500)

    const recruitPages: MetadataRoute.Sitemap = (recruitItems || []).map((r) => ({
      url: `${baseUrl}/recruit/${r.id}`,
      lastModified: new Date(r.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...projectPages, ...recruitPages]
  } catch (e) {
    console.error('[Sitemap] Error fetching dynamic pages:', e)
    return staticPages
  }
}
