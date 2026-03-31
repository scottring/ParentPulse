import { SelfOnboardPage } from './ClientPage';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [{ personId: '_' }];
}

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <SelfOnboardPage {...props} />;
}
