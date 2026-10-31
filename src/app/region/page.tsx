import { permanentRedirect } from 'next/navigation';

export default function RegionRootRedirect() {
  permanentRedirect('/countries');
}
