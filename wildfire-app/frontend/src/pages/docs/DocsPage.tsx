import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { DOC_GROUPS, DOC_SECTIONS } from "./sections";

const DOCS_PATH = "/docs";

// Markdown styling
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mt-10 mb-3 pb-2 border-b border-border">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-sm leading-7 text-foreground/90 my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1.5 text-sm leading-7 text-foreground/90">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1.5 text-sm leading-7 text-foreground/90">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-primary/60 bg-primary/5 rounded-r-lg px-4 py-1 [&_p]:my-2">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => <th className="text-left font-semibold text-foreground px-3 py-2 border-b border-border">{children}</th>,
  td: ({ children }) => <td className="align-top px-3 py-2 border-b border-border text-foreground/90">{children}</td>,
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-6 [&_code]:bg-transparent [&_code]:p-0">{children}</pre>
  ),
  code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>,
  hr: () => <hr className="my-8 border-border" />,
};

const DocsPage: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const index = DOC_SECTIONS.findIndex((s) => s.slug === section);
  const current = DOC_SECTIONS[index];
  useDocumentTitle(current ? `${current.title} · Documentation` : "Documentation");

  // Reset scroll
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [section]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_GROUPS;
    return DOC_GROUPS.map((g) => ({
      ...g,
      sections: g.sections.filter((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)),
    })).filter((g) => g.sections.length > 0);
  }, [query]);

  if (!current) return <Navigate to={`${DOCS_PATH}/${DOC_SECTIONS[0].slug}`} replace />;

  const prev = DOC_SECTIONS[index - 1];
  const next = DOC_SECTIONS[index + 1];

  return (
    <div className="flex h-full bg-background">
      {/* Section nav */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-card border-r border-border">
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Documentation</h1>
          <p className="text-xs text-muted-foreground mt-1">Guides for using and developing STORCITO Wildfire</p>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              className="w-full rounded-lg border border-border bg-background pl-8 pr-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</p>
              <div className="space-y-0.5">
                {group.sections.map((s) => {
                  const Icon = s.icon;
                  const active = s.slug === current.slug;
                  return (
                    <Link
                      key={s.slug}
                      to={`${DOCS_PATH}/${s.slug}`}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="px-2 text-sm text-muted-foreground">No pages match "{query}".</p>}
        </nav>
      </aside>

      {/* Content */}
      <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          {/* Mobile nav */}
          <div className="md:hidden mb-6">
            <select
              value={current.slug}
              onChange={(e) => navigate(`${DOCS_PATH}/${e.target.value}`)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              aria-label="Documentation section"
            >
              {DOC_GROUPS.map((g) => (
                <optgroup key={g.title} label={g.title}>
                  {g.sections.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <article>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {current.content}
            </ReactMarkdown>
          </article>

          {/* Prev / next */}
          <div className="mt-12 pt-6 border-t border-border grid grid-cols-2 gap-4">
            {prev ? (
              <Link to={`${DOCS_PATH}/${prev.slug}`} className="rounded-lg border border-border p-3 hover:bg-muted transition-colors">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="w-3.5 h-3.5" />Previous</span>
                <span className="block mt-0.5 text-sm font-medium text-foreground">{prev.title}</span>
              </Link>
            ) : <span />}
            {next && (
              <Link to={`${DOCS_PATH}/${next.slug}`} className="rounded-lg border border-border p-3 text-right hover:bg-muted transition-colors">
                <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">Next<ChevronRight className="w-3.5 h-3.5" /></span>
                <span className="block mt-0.5 text-sm font-medium text-foreground">{next.title}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
