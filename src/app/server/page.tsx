import { permanentRedirect } from 'next/navigation';

export default function ServerRootRedirect() {
  permanentRedirect('/discord-servers');
}
