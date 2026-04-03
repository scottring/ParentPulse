import GrowthItemWorkspace from './ClientPage';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [{ itemId: '_' }];
}

export default function Page(props: { params: Promise<{ itemId: string }> }) {
  return <GrowthItemWorkspace {...props} />;
}
