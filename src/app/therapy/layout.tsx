import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Therapy Prep · Relish',
  description: 'A private prep space for your therapy sessions.',
};

export default function TherapyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
