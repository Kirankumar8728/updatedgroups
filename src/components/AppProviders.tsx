'use client';

import React from 'react';
import ClientProviders from '@/src/components/ClientProviders';

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientProviders>{children}</ClientProviders>;
}
