import { permanentRedirect } from 'next/navigation';

export default function CommunityRootRedirect() {
  permanentRedirect('/');
}
