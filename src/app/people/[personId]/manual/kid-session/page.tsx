import { KidSessionPage } from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <KidSessionPage {...props} />;
}
