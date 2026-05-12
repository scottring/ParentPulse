import GrowthItemWorkspace from './ClientPage';

export default function Page(props: { params: Promise<{ experimentId: string }> }) {
  return <GrowthItemWorkspace {...props} />;
}
