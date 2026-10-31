import { permanentRedirect } from 'next/navigation';

export default function LanguageRootRedirect() {
  permanentRedirect('/languages');
}
