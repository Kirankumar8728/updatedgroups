import { permanentRedirect } from 'next/navigation';

export default function RedditGroupsRedirectPage() {
  permanentRedirect('/reddit-communities');
}
