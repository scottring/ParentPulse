import GrowthItemWorkspace from './ClientPage';

export default function Page(props: { params: Promise<{ itemId: string }> }) {
  return <GrowthItemWorkspace {...props} />;
}
