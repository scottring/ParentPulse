import { CreateManualPage } from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <CreateManualPage {...props} />;
}
