import { CreateManualPage } from './ClientPage';

export const dynamic = 'force-static';

const DEMO_IDS = ['demo-person-alex', 'demo-person-jordan', 'demo-person-mia'];

export async function generateStaticParams() {
  return ['_', ...DEMO_IDS].map((personId) => ({ personId }));
}

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <CreateManualPage {...props} />;
}
