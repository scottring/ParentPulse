import { ObserverOnboardPage } from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <ObserverOnboardPage {...props} />;
}
