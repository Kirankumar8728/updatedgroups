import { permanentRedirect } from 'next/navigation';

export default function CountryRootRedirect() {
  permanentRedirect('/countries');
}
