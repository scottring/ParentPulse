import { KidObserverSessionPage } from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <KidObserverSessionPage {...props} />;
}
