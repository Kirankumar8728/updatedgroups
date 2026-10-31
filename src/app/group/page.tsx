import { permanentRedirect } from 'next/navigation';

export default function GroupRootRedirect() {
  permanentRedirect('/');
}
