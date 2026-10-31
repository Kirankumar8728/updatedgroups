import { permanentRedirect } from 'next/navigation';

export default function CategoryRootRedirect() {
  permanentRedirect('/categories');
}
