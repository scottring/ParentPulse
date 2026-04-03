import DeepenPage from './ClientPage';
import { ALL_DIMENSIONS } from '@/config/relationship-dimensions';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return ALL_DIMENSIONS.map((d) => ({ dimensionId: d.id }));
}

export default function Page() {
  return <DeepenPage />;
}
