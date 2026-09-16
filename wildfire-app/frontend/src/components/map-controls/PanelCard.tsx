import { FC, ReactNode } from "react";

/** Floating map panel */
export const PanelCard: FC<{
  position?: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}> = ({ position, icon, title, children }) => (
  <section
    className={`md-fade-in ${position ? `absolute ${position}` : ""} z-10 w-44 overflow-hidden rounded-xl border border-border/60 bg-card/95 text-xs shadow-lg backdrop-blur-md transition-all duration-300`}
  >
    <header className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-2.5 py-1.5">
      <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
        {title}
      </span>
    </header>
    {children}
  </section>
);
