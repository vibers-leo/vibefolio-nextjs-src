// src/lib/supabase-storage.ts — NCP 스토리지 전환 (Supabase Storage 제거)
// 이미지는 http://49.50.138.93:8090/ 사용

// 호환성 유지를 위한 스텁 — 기존 getStorageClient() 호출처에서 사용
const storageStub: any = {
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Supabase Storage 제거됨 — NCP 사용' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ error: null }),
    }),
  },
};

export const storageClient = storageStub;

export function getStorageClient() {
  return storageStub;
}
