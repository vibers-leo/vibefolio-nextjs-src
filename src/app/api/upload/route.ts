// src/app/api/upload/route.ts — NCP Storage 업로드 API
import { NextRequest, NextResponse } from 'next/server';
import { uploadToNCP, generateFilename } from '@/lib/ncp-storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
];

/** 카테고리 → NCP 저장 경로 매핑 */
function getStoragePath(category: string): string {
  switch (category) {
    case 'profiles':
      return 'profiles/uploads';
    case 'projects':
    default:
      return 'projects/uploads';
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'projects';

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기 초과 (최대 ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 },
      );
    }

    // MIME 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `허용되지 않는 파일 형식: ${file.type}` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateFilename(file.name);
    const storagePath = getStoragePath(category);

    const publicUrl = await uploadToNCP(buffer, storagePath, filename);

    return NextResponse.json({
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[Upload] NCP 업로드 실패:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다' },
      { status: 500 },
    );
  }
}
