import { permanentRedirect } from 'next/navigation';

export default function DiscordGroupsRedirectPage() {
  permanentRedirect('/discord-servers');
}
