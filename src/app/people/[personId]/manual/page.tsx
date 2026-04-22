import { redirect } from 'next/navigation';

// The person's page is now one scroll — no separate /manual route.
// Keep the URL working by redirecting to the consolidated page.
export default async function Page({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  redirect(`/people/${personId}`);
}
