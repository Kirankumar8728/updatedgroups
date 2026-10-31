import { permanentRedirect } from 'next/navigation';

export default function BotRootRedirect() {
  permanentRedirect('/telegram-channels');
}
