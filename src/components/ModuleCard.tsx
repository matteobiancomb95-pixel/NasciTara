import type { ReactNode } from 'react';

import { StatusBadge, type ModuleStatus } from './StatusBadge';

interface ModuleCardProps {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  status: ModuleStatus;
  hiddenOnMobile?: boolean;
  children: ReactNode;
}

export function ModuleCard({
  id,
  title,
  subtitle,
  icon,
  status,
  hiddenOnMobile,
  children,
}: ModuleCardProps) {
  return (
    <section className="module" id={id} data-hidden={hiddenOnMobile ? 'true' : 'false'} aria-labelledby={`${id}-title`}>
      <header className="module__head">
        <span className="module__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="module__titles">
          <h2 className="module__title" id={`${id}-title`}>
            {title}
          </h2>
          <p className="module__sub">{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      <div className="module__body">{children}</div>
    </section>
  );
}
