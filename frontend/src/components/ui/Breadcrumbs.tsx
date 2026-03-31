import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300">/</span>}
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="hover:text-gray-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? 'text-gray-900' : ''}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
