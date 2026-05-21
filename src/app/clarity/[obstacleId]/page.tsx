import { ClientPage } from './ClientPage';

interface Props {
  params: Promise<{ obstacleId: string }>;
}

export default async function ClarityObstaclePage({ params }: Props) {
  const { obstacleId } = await params;
  return <ClientPage obstacleId={obstacleId} />;
}
