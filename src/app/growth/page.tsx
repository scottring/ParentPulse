import { redirect } from 'next/navigation';

export default function GrowthLegacyRedirect() {
  redirect('/experiments');
}
