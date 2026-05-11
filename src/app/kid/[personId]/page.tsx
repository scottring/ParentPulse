import { redirect } from 'next/navigation';

export default async function KidLegacyRedirect({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  redirect(`/check-in/${personId}`);
}
