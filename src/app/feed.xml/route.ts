import { createClient } from '@/lib/supabase/admin'
import { BASE_URL } from '@/lib/constants'

export async function GET() {
  const baseUrl = BASE_URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let projectItems = ''
  let recruitItemsXml = ''

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })

    // 최신 프로젝트 50개
    const { data: projects } = await supabase
      .from('Project')
      .select('project_id, title, description, thumbnail_url, created_at, updated_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(50)

    projectItems = (projects || []).map((p) => `
    <item>
      <title><![CDATA[${p.title || ''}]]></title>
      <link>${baseUrl}/project/${p.project_id}</link>
      <description><![CDATA[${(p.description || '').slice(0, 300)}]]></description>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <guid>${baseUrl}/project/${p.project_id}</guid>
      <category>프로젝트</category>
    </item>`).join('')

    // 최신 채용/공모전 50개
    const { data: recruits } = await supabase
      .from('recruit_items')
      .select('id, title, description, type, date, company, created_at')
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    recruitItemsXml = (recruits || []).map((r) => {
      const typeLabel = r.type === 'job' ? '채용' : r.type === 'contest' ? '공모전' : '이벤트'
      return `
    <item>
      <title><![CDATA[[${typeLabel}] ${r.title || ''}]]></title>
      <link>${baseUrl}/recruit/${r.id}</link>
      <description><![CDATA[${r.company ? r.company + ' | ' : ''}${(r.description || '').slice(0, 300)}]]></description>
      <pubDate>${new Date(r.created_at).toUTCString()}</pubDate>
      <guid>${baseUrl}/recruit/${r.id}</guid>
      <category>${typeLabel}</category>
    </item>`
    }).join('')
  } catch (e) {
    console.error('[RSS] Error generating feed:', e)
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vibefolio - 크리에이터를 위한 영감 저장소</title>
    <link>${baseUrl}</link>
    <description>디자이너, 개발자, 기획자를 위한 프로젝트 아카이빙 및 채용/공모전 정보 플랫폼</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />${projectItems}${recruitItemsXml}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
