// src/lib/supabase/storage.ts — NCP Storage 업로드 (/api/upload 경유)
// 이미지는 https://storage.vibers.co.kr 에서 서빙

/**
 * 이미지 압축 및 리사이징 (Client-side)
 */
async function compressImage(file: File, maxWidth: number = 1920, maxHeight: number = 1080, quality: number = 0.8): Promise<File | Blob> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) return file;

  // GIF는 압축하지 않음 (애니메이션 손실 방지)
  if (file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            if (blob.size > file.size) {
              resolve(file);
            } else {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
            }
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 업로드 — /api/upload 를 통해 NCP 서버로 전송
 */
export async function uploadImage(
  file: File,
  bucket: string = 'projects'
): Promise<string> {
  // 클라이언트에서 이미지 압축
  const compressed = file.type.startsWith('image/')
    ? await compressImage(file)
    : file;

  const formData = new FormData();
  formData.append('file', compressed instanceof Blob ? new File([compressed], file.name, { type: compressed.type || file.type }) : compressed);
  formData.append('category', bucket); // 'projects' | 'profiles'

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '업로드 실패' }));
    throw new Error(err.error || '업로드 실패');
  }

  const data = await res.json();
  return data.url;
}

/**
 * 이미지 삭제
 */
export async function deleteImage(
  imageUrl: string,
  bucket: string = 'projects'
): Promise<void> {
  console.log('[Storage] deleteImage (no-op):', imageUrl.substring(0, 50));
}

/**
 * Base64 이미지를 File 객체로 변환
 */
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * 외부 URL 이미지 — fetch 후 NCP에 업로드
 */
export async function uploadImageFromUrl(
  url: string,
  bucket: string = 'projects'
): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url; // 실패 시 원본 URL 반환
    const blob = await res.blob();
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const file = new File([blob], `external-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });
    return await uploadImage(file, bucket);
  } catch {
    console.warn('[Storage] 외부 이미지 업로드 실패, 원본 URL 반환:', url.substring(0, 60));
    return url;
  }
}

/**
 * 일반 파일 업로드
 */
export async function uploadFile(
  file: File,
  bucket: string = 'recruit_files'
): Promise<{ url: string; name: string; size: number; type: string }> {
  const url = await uploadImage(file, bucket);
  return { url, name: file.name, size: file.size, type: file.type };
}
