'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** Her oyun ekranında görünen sabit "Geri" düğmesi (oyun listesine döner). */
export function AppBackLink({ href = '/', label = 'Geri' }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="app-back" aria-label={`${label}: oyun listesine dön`}>
      <ArrowLeft size={18} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
