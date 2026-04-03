import { SelfOnboardPage } from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <SelfOnboardPage {...props} />;
}
