import ClientPage from './ClientPage';

export default function Page(props: { params: Promise<{ personId: string }> }) {
  return <ClientPage {...props} />;
}
