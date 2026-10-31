import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-400 overflow-x-auto whitespace-nowrap py-2 ${className}`}>
      <ol className="flex items-center gap-1.5 list-none p-0 m-0">
        <li className="inline-flex items-center">
          <Link
            href="/"
            prefetch={true}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={item.url + index}>
              <li className="text-slate-600 dark:text-slate-600">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>
              <li className="inline-flex items-center">
                {isLast ? (
                  <span className="font-semibold text-slate-200 truncate max-w-[200px] sm:max-w-[300px]" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.url}
                    prefetch={false}
                    className="text-slate-400 hover:text-emerald-400 transition-colors truncate max-w-[150px] sm:max-w-[220px]"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
