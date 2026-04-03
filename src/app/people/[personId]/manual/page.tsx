import { ManualPage } from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <ManualPage {...props} />;
}
