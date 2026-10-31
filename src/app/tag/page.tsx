import { permanentRedirect } from 'next/navigation';

export default function TagRootRedirect() {
  permanentRedirect('/tags');
}
