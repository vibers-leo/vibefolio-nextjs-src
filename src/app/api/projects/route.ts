import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAnon } from '@/lib/supabase/client'; // Rename to avoid confusion
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server'; // For Session Auth
import { GENRE_TO_CATEGORY_ID } from '@/lib/constants';

// 캐시 설정 (성능 최적화: 60초 캐싱으로 초기 로드 속도 개선)
export const revalidate = 60; 

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search');
    
    // [Optimization] Get sorting option
    const sortBy = searchParams.get('sortBy') || 'latest';
    const offset = (page - 1) * limit;

    // [Optimization] Select only necessary fields for grid display to reduce payload size
    // [Performance] Using 'estimated' count instead of 'exact' for faster responses
    let query = (supabaseAnon as any)
      .from('Project')
      .select(`
        project_id, user_id, category_id, title, rendering_type, 
        thumbnail_url, views_count, likes_count, created_at, 
        content_text, description,
        custom_data, allow_michelin_rating, allow_stickers, 
        allow_secret_comments, visibility, scheduled_at, audit_deadline, is_growth_requested
      `, { count: 'estimated' }) 
      .is('deleted_at', null);

    // Apply Sorting based on sortBy parameter
    if (sortBy === 'popular' || sortBy === 'views') {
      query = query.order('views_count', { ascending: false });
    } else if (sortBy === 'likes') {
      query = query.order('likes_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    // [Security Filter]
    const authHeader = request.headers.get('Authorization');
    let authenticatedUser = null;
    
    if (authHeader) {
        try {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabaseAnon.auth.getUser(token);
            authenticatedUser = user;
        } catch (e) {}
    }

    // 분야/성장모드 필터
    const field = searchParams.get('field');
    const mode = searchParams.get('mode');

    // 작성자가 본인 글을 요청하는 경우가 아니면 visibility 필터링
    if (!(userId && authenticatedUser && authenticatedUser.id === userId)) {
       const nowISO = new Date().toISOString();
       if (mode === 'growth' || mode === 'audit') {
          // 성장/심사 모드인 경우 public 또는 unlisted 모두 허용 (심사 필요하므로)
          query = query.in('visibility', ['public', 'unlisted']);
       } else {
          query = query.eq('visibility', 'public');
       }
       query = query.or(`scheduled_at.is.null,scheduled_at.lte.${nowISO}`);
    }

    // 검색어 필터
    if (search) {
      query = query.or(`title.ilike.%${search}%,content_text.ilike.%${search}%`);
    }

    // 카테고리 필터
    if (category && category !== 'all' && category !== 'korea') {
      const categoryId = GENRE_TO_CATEGORY_ID[category];
      if (categoryId) query = query.eq('category_id', categoryId);
    }

    // (field and mode are already declared above)
    if (mode === 'growth') {
       // is_growth_requested column might not exist, so we check custom_data
       query = query.or(`is_growth_requested.is.true,custom_data->>is_growth_requested.eq.true,custom_data->>is_feedback_requested.eq.true,custom_data->>show_in_growth.eq.true`);
    } else if (mode === 'audit') {
       query = query.not('custom_data->audit_config', 'is', null);
    }

    if (field && field !== 'all') {
       const { data: fieldData } = await (supabaseAnon as any)
         .from('fields').select('id').eq('slug', field).single();
       
       if (fieldData) {
          const { data: pFields } = await (supabaseAnon as any)
             .from('project_fields').select('project_id').eq('field_id', fieldData.id);
          
          if (pFields && pFields.length > 0) {
             const pIds = pFields.map((row:any) => row.project_id);
             query = query.in('project_id', pIds);
          } else {
             query = query.eq('project_id', -1); 
          }
       }
    }

    if (userId) query = query.eq('user_id', userId);

    const { data, error, count } = await query;

    if (error) throw error;

    // 작성자 정보 병합 (최적화)
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))] as string[];

      if (userIds.length > 0) {
        const targetClient = supabaseAdmin || supabaseAnon;
        
        // profiles 테이블에서 우선 조회 (유저 인스턴스 당 1회 쿼리)
        const { data: usersData } = await targetClient
          .from('profiles')
          .select('id, username, avatar_url, points, role, expertise')
          .in('id', userIds);

        const userMap = new Map();
        
        if (usersData) {
          usersData.forEach((u: any) => {
            userMap.set(u.id, {
              username: u.username || 'Unknown',
              avatar_url: u.avatar_url || '/globe.svg',
              expertise: u.expertise || null,
            });
          });
        }

        // 부족한 유저 정보가 있다면 users 테이블에서 보충
        const missingUserIds = userIds.filter(id => !userMap.has(id));
        if (missingUserIds.length > 0) {
           const { data: fallbackUsers } = await targetClient
             .from('users')
             .select('id, nickname, profile_image_url')
             .in('id', missingUserIds);
           
           fallbackUsers?.forEach((u: any) => {
             userMap.set(u.id, {
               username: u.nickname || 'Unknown',
               avatar_url: u.profile_image_url || '/globe.svg',
               expertise: null,
             });
           });
        }

        data.forEach((project: any) => {
          project.users = userMap.get(project.user_id) || { username: 'Unknown', avatar_url: '/globe.svg' };
          project.User = project.users; 
        });
      }
    }

    return NextResponse.json({
      projects: data, 
      data: data, 
      metadata: {
        total: count || 0,
        page: page,
        limit: limit,
        hasMore: data?.length === limit
      }
    });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let authenticatedUserId: string | null = null;
    let isApiContext = false;
    const authHeader = request.headers.get('Authorization');

    // [1] API Key Authentication (Strict)
    if (authHeader) {
        // Bearer 접두사 제거 (대소문자 무관)
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        
        // vf_로 시작하면 API Key로 간주
        if (token.startsWith('vf_')) {
             const { data: keyRecord, error: keyError } = await supabaseAdmin
                .from('api_keys')
                .select('user_id')
                .eq('api_key', token)
                .eq('is_active', true)
                .single();
            
             if (keyRecord) {
                 authenticatedUserId = keyRecord.user_id;
                 isApiContext = true;
                 console.log(`[API] Key Auth Success User: ${authenticatedUserId}`);
             } else {
                 console.warn(`[API] Invalid Key: ${token}`);
                 return NextResponse.json({ error: 'Invalid API Key', code: 'INVALID_KEY' }, { status: 401 });
             }
        } else {
             // [Fix] Support JWT Token for Client-side requests
             const { data: { user } } = await supabaseAdmin.auth.getUser(token);
             if (user) {
                 authenticatedUserId = user.id;
             } else {
                 return NextResponse.json({ error: 'Invalid Token', code: 'INVALID_TOKEN' }, { status: 401 });
             }
        }
    } 
    // [2] Session Authentication (Cookie) - Only if no Auth Header
    else {
        // 서버 컴포넌트용 클라이언트 생성 (쿠키 자동 처리)
        const supabase = createClient();
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();
        
        if (user) {
            authenticatedUserId = user.id;
            // console.log(`[API] Session Auth Success User: ${authenticatedUserId}`);
        } else {
            // 세션 없음 -> 인증 실패
            console.warn('[API] No Session found');
            return NextResponse.json({ error: 'Authentication Required (Login or API Key)', code: 'AUTH_REQUIRED' }, { status: 401 });
        }
    }

    // 최종 인증 실패 확인
    if (!authenticatedUserId) {
        return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    let { 
      // user_id는 Body에서 받더라도 무시하고, 인증된 ID를 사용함
      category_id, title, summary, 
      content_text, content, body: bodyContent, text, // Allow various content field names
      description, alt_description, thumbnail_url, rendering_type, custom_data,
      allow_michelin_rating, allow_stickers, allow_secret_comments, scheduled_at, visibility,
      assets, // [New] Assets from editor
      audit_deadline, is_growth_requested // [New] V-Audit advanced fields
    } = body;

    // [Robustness] Normalize Content
    // 외부 에이전트가 어떤 필드로 보내든 content_text로 통합
    let finalContent = content_text || content || bodyContent || text || '';
    
    // 설명이 없고 본문만 있다면 설명을 본문 앞부분으로 대체 (선택적) 또는 반대로 설명만 있다면 본문으로 사용
    if (!finalContent && description) {
        finalContent = description;
    }

    const user_id = authenticatedUserId;

    // [Robustness] Handle category_id as slug or missing
    if (category_id && typeof category_id === 'string') {
        // Try parsing string to number first (e.g. "11")
        const parsedNum = Number(category_id);
        if (!isNaN(parsedNum)) {
            category_id = parsedNum;
        } else {
             // If not a number string, try mapping from slug (e.g. "webapp")
            const mappedId = GENRE_TO_CATEGORY_ID[category_id.toLowerCase()];
            category_id = mappedId || 1; 
        }
    } else if (typeof category_id === 'number') {
        // Already a number
    } else {
        category_id = 1; // Default
    }
    
    // Safety check
    if (isNaN(category_id)) category_id = 1;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.', code: 'MISSING_TITLE' }, { status: 400 });
    }
    // Content is verified but allowed empty if user intends just a title/image post

    // [Validation] Verify User Exists in Profiles (Double Check)
    const { data: userExists } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user_id)
        .single();
    
    if (!userExists) {
        return NextResponse.json({ 
            error: `User Profile Not Found: ${user_id}`,
            code: 'USER_PROFILE_NOT_FOUND' 
        }, { status: 400 });
    }

    // [Point System] Growth Mode Check & Points Deduction
    // ... (Point logic omitted for brevity, logic remains same)
    // Assets Handling: Merge into custom_data
    let finalCustomData = custom_data;
    try {
        if (typeof finalCustomData === 'string') finalCustomData = JSON.parse(finalCustomData);
        if (!finalCustomData) finalCustomData = {};
        
        if (assets) {
            finalCustomData.assets = assets;
        }
    } catch (e) {
        finalCustomData = { assets: assets || [] };
    }

    // Point Deduction Logic (Re-implemented for context)
    let isGrowthMode = false;
    if (finalCustomData?.is_feedback_requested) {
        isGrowthMode = true;
    }

    // [Point System] Growth Mode 포인트 차감 로직 비활성화 (USER 요청)
    /*
    if (isGrowthMode) {
        const { data: profile } = await (supabaseAdmin as any)
            .from('profiles').select('points').eq('id', user_id).single();
        
        const currentPoints = profile?.points || 0;
        const COST = 500;

        if (currentPoints < COST) {
            return NextResponse.json({ error: `Not enough points (${currentPoints}/${COST})`, code: 'INSUFFICIENT_POINTS' }, { status: 402 });
        }
        
        await (supabaseAdmin as any).from('profiles').update({ points: currentPoints - COST }).eq('id', user_id);
        await (supabaseAdmin as any).from('point_logs').insert({ user_id: user_id, amount: -COST, reason: 'Growth Mode Project' });
    }
    */

    // [Fix] Ensure extended fields are in custom_data since they might not exist as columns
    const safeCustomData = {
        ...(typeof finalCustomData === 'object' ? finalCustomData : {}),
        audit_deadline: audit_deadline,
        is_growth_requested: is_growth_requested ?? false,
        summary: summary,
        alt_description: alt_description
    };

    let { data, error } = await (supabaseAdmin as any)
      .from('Project')
      .insert([{ 
        user_id, category_id, title, 
        // summary removed (not in type)
        content_text: finalContent, 
        description: description || finalContent, 
        // alt_description removed (not in type)
        thumbnail_url, 
        rendering_type: rendering_type || 'rich_text', 
        custom_data: JSON.stringify(safeCustomData), 
        allow_michelin_rating: allow_michelin_rating ?? true, 
        allow_stickers: allow_stickers ?? true, 
        allow_secret_comments: allow_secret_comments ?? true,
        scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null, // Keeping scheduled_at as it might be used in GET
        visibility: visibility || 'public',
        // audit_deadline removed (using custom_data)
        // is_growth_requested removed (using custom_data only)
        likes_count: 0, views_count: 0 
      }] as any)
      .select()
      .single();

    if (error) {
      console.error('Project creation failed:', error);
      return NextResponse.json(
        { error: `Creation failed: ${error.message}` },
        { status: 500 }
      );
    }


    // [New] 표준화된 Fields 매핑 저장
    if (data && data.project_id && custom_data) {
        try {
            // custom_data가 이미 객체일 수 있으므로 string일 때만 파싱
            const parsedCustom = typeof custom_data === 'string' ? JSON.parse(custom_data) : custom_data;
            const fieldSlugs = parsedCustom.fields; 

            if (Array.isArray(fieldSlugs) && fieldSlugs.length > 0) {
                const { data: fieldRecords } = await (supabaseAdmin as any)
                    .from('fields')
                    .select('id, slug')
                    .in('slug', fieldSlugs);

                if (fieldRecords && fieldRecords.length > 0) {
                     const mappingData = fieldRecords.map((f: any) => ({
                         project_id: data.project_id,
                         field_id: f.id
                     }));
                     
                     await (supabaseAdmin as any)
                        .from('project_fields') 
                        .insert(mappingData);
                }
            }
        } catch (e) {
            console.error('Field mapping error', e); 
            // Mapping 실패가 전체 실패는 아님
        }
    }

    // [New] 복수 카테고리 저장 (project_categories)
    if (data && data.project_id && custom_data) {
        try {
            const parsedCustom = typeof custom_data === 'string' ? JSON.parse(custom_data) : custom_data;
            const genres = parsedCustom.genres || [];
            const fields = parsedCustom.fields || [];
            
            const categoryMappings: Array<{ project_id: number; category_id: number; category_type: string }> = [];

            // Genres → category_type: 'genre'
            if (Array.isArray(genres) && genres.length > 0) {
                genres.forEach((genreSlug: string) => {
                    const catId = GENRE_TO_CATEGORY_ID[genreSlug];
                    if (catId) {
                        categoryMappings.push({
                            project_id: data.project_id,
                            category_id: catId,
                            category_type: 'genre'
                        });
                    }
                });
            }

            // Fields → category_type: 'field' (필요시 별도 매핑 테이블 사용 가능)
            // 현재는 fields를 태그처럼 저장 (향후 확장 가능)
            if (Array.isArray(fields) && fields.length > 0) {
                // fields는 slug 형태이므로, 필요시 Category 테이블에서 조회하거나
                // 단순히 custom_data에만 저장 (현재 구조 유지)
                // 여기서는 genres만 project_categories에 저장
            }

            if (categoryMappings.length > 0) {
                const { error: catError } = await (supabaseAdmin as any)
                    .from('project_categories')
                    .insert(categoryMappings);

                if (catError) {
                    console.error('[API] Category mappings insert failed:', catError);
                } else {
                    console.log('[API] Category mappings created:', categoryMappings.length);
                }
            }
        } catch (e) {
            console.error('[API] Saving project categories failed:', e);
        }
    }

    // [New] 시리즈(에피소드) 연재 기능
    // 'collection'은 북마크 용도, 'series'는 연재 용도로 구분합니다.
    const { series_id, collection_id } = body;
    const collaborator_emails = body.collaborator_emails || body.collaborators || [];
    
    // 1. 시리즈(에피소드)로 추가하는 경우 (우선순위 높음)
    if (data && data.project_id && series_id) {
         try {
             // 소유권 확인
             const { data: collection } = await (supabaseAdmin as any)
                .from('Collection')
                .select('user_id, type')
                .eq('collection_id', series_id)
                .single();
             
             if (collection && collection.user_id === user_id) {
                 // 타입이 'series'가 아니라면 업데이트 (명시적 구분)
                 if (collection.type !== 'series') {
                     await (supabaseAdmin as any)
                        .from('Collection')
                        .update({ type: 'series' })
                        .eq('collection_id', series_id);
                 }

                 // 에피소드 추가
                 await (supabaseAdmin as any)
                    .from('CollectionItem')
                    .insert({ 
                        collection_id: series_id, 
                        project_id: data.project_id 
                    });
                 console.log(`[API] Added project ${data.project_id} to SERIES ${series_id}`);
             } else {
                 console.warn(`[API] Series ${series_id} not found or permission denied`);
             }
         } catch (e) {
             console.error('[API] Failed to add to series:', e);
         }
    }
    // 2. 일반 컬렉션(북마크)에 추가하는 경우 (하위 호환성)
    else if (data && data.project_id && collection_id) {
        try {
             const { data: collection } = await (supabaseAdmin as any)
                .from('Collection')
                .select('user_id')
                .eq('collection_id', collection_id)
                .single();
             
             if (collection && collection.user_id === user_id) {
                 await (supabaseAdmin as any)
                    .from('CollectionItem')
                    .insert({ 
                        collection_id: collection_id, 
                        project_id: data.project_id 
                    });
                 console.log(`[API] Added project ${data.project_id} to Collection ${collection_id}`);
             }
        } catch (e) {
            console.error('[API] Failed to add to collection:', e);
        }
    }

    // [New] 공동 제작자 추가 (Collaborators)
    // const { collaborator_emails } = body; (Moved up)
    if (data && data.project_id && Array.isArray(collaborator_emails) && collaborator_emails.length > 0) {

        try {
             // 이메일로 User ID 조회 (profiles 테이블 사용 가정)
             const { data: users } = await (supabaseAdmin as any)
                .from('profiles')
                .select('id, email') // profiles에 이메일이 있다고 가정 (Trigger로 동기화됨을 전제)
                .in('email', collaborator_emails);
             
             if (users && users.length > 0) {
                 const currentCollaborators = users.map((u: any) => ({
                     project_id: data.project_id,
                     user_id: u.id
                 }));

                 const { error: collabError } = await (supabaseAdmin as any)
                     .from('project_collaborators')
                     .insert(currentCollaborators);
                 
                 if (collabError) console.error('[API] Collaborators insert error:', collabError);
                 else console.log(`[API] Added ${users.length} collaborators.`);
             } else {
                 console.log('[API] No users found for given emails');
             }
        } catch (e) {
            console.error('[API] Failed to add collaborators:', e);
        }
    }

    // [Point System] Reward for Upload (General Projects)
    if (!isGrowthMode && data && data.project_id) {
         try {
             // [New] 일일 보상 한도 체크 (하루 최대 3회)
             const todayStart = new Date();
             todayStart.setHours(0,0,0,0);
             const todayISO = todayStart.toISOString();

             const { count: dailyCount, error: countError } = await (supabaseAdmin as any)
                .from('point_logs')
                .select('*', { count: 'exact', head: true }) // head: true means count only
                .eq('user_id', user_id)
                .eq('reason', '프로젝트 업로드 보상')
                .gte('created_at', todayISO);
             
             if (countError) {
                 console.error('[Point System] Failed to check daily limit:', countError);
             }

             if ((dailyCount || 0) >= 3) {
                 console.log(`[Point System] Daily upload reward limit reached for user ${user_id} (Count: ${dailyCount})`);
             } else {
                 // 1. Get current points
                 const { data: profile } = await (supabaseAdmin as any)
                    .from('profiles')
                    .select('points')
                    .eq('id', user_id)
                    .single();
                 
                 const currentPoints = profile?.points || 0;
                 const REWARD = 100;
    
                 // 2. Add Points

             await (supabaseAdmin as any)
                .from('profiles')
                .update({ points: currentPoints + REWARD })
                .eq('id', user_id);

             // 3. Log
             await (supabaseAdmin as any)
                .from('point_logs')
                .insert({
                    user_id: user_id,
                    amount: REWARD,
                    reason: '프로젝트 업로드 보상'
                });
            
             // 4. Send Notification (Duplicate Issue Fix: Disabled temporarily)
             /*
             await (supabaseAdmin as any)
                .from('notifications')
                .insert({
                    user_id: user_id,
                    type: 'point',
                    title: '내공 획득! 🪙',
                    message: `프로젝트 업로드 보상으로 ${REWARD} 내공을 받았습니다.`,
                    link: '/mypage',
                    read: false
                });
             */
             
             console.log(`[Point System] Awarded ${REWARD} points to user ${user_id} for upload.`);
             } // Close else
         } catch (e) {
             console.error('[Point System] Failed to award upload points:', e);
         }
    }
    
    return NextResponse.json({ project: data }, { status: 201 });
  } catch (error: any) {
    console.error('서버 오류:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
