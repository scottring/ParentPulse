import { redirect } from 'next/navigation';

export default async function GrowthDetailLegacyRedirect({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  redirect(`/experiments/${itemId}`);
}
