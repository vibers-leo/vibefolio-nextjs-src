// src/app/recruit/[id]/page.tsx
import { Metadata, ResolvingMetadata } from "next";
import prisma from "@/lib/db";
import RecruitDetailClient from "@/components/recruit/RecruitDetailClient";
import { notFound } from "next/navigation";

interface Props {
  params: { id: string };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const item = await prisma.vf_recruit_items.findUnique({ where: { id: params.id } });

  if (!item) return { title: '정보를 찾을 수 없습니다 | Vibefolio' };

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${item.title} | Vibefolio Recruit`,
    description: item.description?.substring(0, 160) ?? '',
    openGraph: {
      title: item.title ?? '',
      description: item.description?.substring(0, 160) ?? '',
      url: `https://vibefolio.net/recruit/${params.id}`,
      siteName: 'Vibefolio',
      images: [item.thumbnail || '/images/default-banner.jpg', ...previousImages],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: item.title ?? '',
      description: item.description?.substring(0, 160) ?? '',
      images: [item.thumbnail || '/images/default-banner.jpg'],
    },
  };
}

export default async function RecruitDetailPage({ params }: Props) {
  const item = await prisma.vf_recruit_items.findUnique({ where: { id: params.id } });

  if (!item) notFound();

  // 조회수 증가
  prisma.vf_recruit_items.update({
    where: { id: params.id },
    data: { views_count: (item.views_count ?? 0) + 1 },
  }).catch(() => {});

  return <RecruitDetailClient item={item as any} />;
}
