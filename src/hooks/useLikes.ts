import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createNotification } from "@/hooks/useNotifications";
import { useAuth, getToken } from "@/lib/auth/AuthContext";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/**
 * 프로젝트 좋아요 관련 기능을 제공하는 커스텀 훅
 */
export function useLikes(projectId?: string, initialLikes: number = 0, enableRealtimeSync: boolean = false) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id || null;

  const [likesCount, setLikesCount] = useState(initialLikes);

  // 좋아요 수 조회 (폴링 대체)
  useEffect(() => {
    if (!projectId || !enableRealtimeSync) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/likes?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.count !== undefined) setLikesCount(data.count);
        }
      } catch {}
    };
    fetchCount();
  }, [projectId, enableRealtimeSync]);

  // 1. 좋아요 여부 조회
  const { data: isLiked = false } = useQuery({
    queryKey: ["like", projectId, userId],
    queryFn: async () => {
      if (!projectId || !userId) return false;
      try {
        const res = await fetch(`/api/likes?userId=${userId}&projectId=${projectId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.liked || false;
      } catch {
        return false;
      }
    },
    enabled: !!projectId && !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // 2. 좋아요 토글 Mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ currentIsLiked }: { currentIsLiked: boolean }) => {
      if (!projectId || !userId) throw new Error("로그인이 필요합니다.");
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ projectId: Number(projectId) }),
      });
      if (!res.ok) throw new Error('좋아요 처리 실패');
      const data = await res.json();

      // 좋아요 추가 시 알림
      if (data.liked) {
        try {
          const projRes = await fetch(`/api/projects/${projectId}`);
          if (projRes.ok) {
            const projData = await projRes.json();
            const project = projData.project;
            if (project && project.user_id !== userId) {
              await createNotification({
                userId: project.user_id,
                type: "like",
                title: "새로운 좋아요!",
                message: `내 프로젝트에 좋아요가 달렸습니다.`,
                link: `/project/${projectId}`,
                senderId: userId
              });
            }
          }
        } catch (e) { console.error(e); }
      }
      return data;
    },
    onMutate: async ({ currentIsLiked }) => {
      const queryKey = ["like", projectId, userId];
      await queryClient.cancelQueries({ queryKey });
      const previousLiked = queryClient.getQueryData<boolean>(queryKey);
      queryClient.setQueryData(queryKey, !currentIsLiked);
      setLikesCount((prev: number) => currentIsLiked ? Math.max(0, prev - 1) : prev + 1);
      return { previousLiked };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousLiked !== undefined) {
        queryClient.setQueryData(["like", projectId, userId], context.previousLiked);
        setLikesCount((prev: number) => context.previousLiked ? prev + 1 : Math.max(0, prev - 1));
      }
      console.error("Like toggle error:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["like", projectId, userId] });
    },
  });

  const toggleLike = () => {
    if (!userId) return;
    toggleLikeMutation.mutate({ currentIsLiked: isLiked });
  };

  return {
    isLiked,
    likesCount,
    toggleLike,
    isLoading: toggleLikeMutation.isPending,
  };
}
