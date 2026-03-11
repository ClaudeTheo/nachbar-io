"use client";

import {
  ExternalLink,
  Database,
  Users,
  GitBranch,
  Globe,
  Rocket,
  Shield,
  FileText,
  Key,
  Table2,
} from "lucide-react";

interface LinkCard {
  group: "infra" | "quick";
  icon: React.ElementType;
  label: string;
  description: string;
  url: string;
  color: string;
}

const EXTERNAL_LINKS: LinkCard[] = [
  // Infrastruktur
  {
    group: "infra",
    icon: Database,
    label: "Supabase Dashboard",
    description: "Projekt-Uebersicht",
    url: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka",
    color: "text-emerald-600",
  },
  {
    group: "infra",
    icon: Table2,
    label: "Table Editor",
    description: "Tabellen direkt bearbeiten",
    url: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/editor",
    color: "text-emerald-600",
  },
  {
    group: "infra",
    icon: FileText,
    label: "SQL Editor",
    description: "SQL-Abfragen ausfuehren",
    url: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/sql/new",
    color: "text-emerald-600",
  },
  {
    group: "infra",
    icon: Users,
    label: "Auth / Nutzer",
    description: "Auth-Nutzer verwalten",
    url: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/auth/users",
    color: "text-emerald-600",
  },
  {
    group: "infra",
    icon: Key,
    label: "API Keys",
    description: "Supabase API-Schluessel",
    url: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/settings/api-keys",
    color: "text-emerald-600",
  },
  {
    group: "infra",
    icon: Shield,
    label: "RLS Policies",
    description: "Row-Level Security verwalten",
    url: "https://supabase.com/dashboard/project/uylszchlyhbpbmslcnka/auth/policies",
    color: "text-emerald-600",
  },
  {
    group: "infra",
    icon: Rocket,
    label: "Vercel Dashboard",
    description: "Deployments & Domains",
    url: "https://vercel.com",
    color: "text-gray-800",
  },
  {
    group: "infra",
    icon: GitBranch,
    label: "GitHub Repository",
    description: "ClaudeTheo/nachbar-io",
    url: "https://github.com/ClaudeTheo/nachbar-io",
    color: "text-gray-700",
  },
  {
    group: "infra",
    icon: GitBranch,
    label: "GitHub Actions",
    description: "CI/CD Pipeline",
    url: "https://github.com/ClaudeTheo/nachbar-io/actions",
    color: "text-gray-700",
  },
  // Schnellzugriff
  {
    group: "quick",
    icon: Globe,
    label: "Live-Seite",
    description: "nachbar-io.vercel.app",
    url: "https://nachbar-io.vercel.app",
    color: "text-quartier-green",
  },
  {
    group: "quick",
    icon: Globe,
    label: "Testanleitung",
    description: "Tester-Checkliste",
    url: "https://nachbar-io.vercel.app/testanleitung",
    color: "text-quartier-green",
  },
  {
    group: "quick",
    icon: Globe,
    label: "Registrierung",
    description: "Register-Seite testen",
    url: "https://nachbar-io.vercel.app/register",
    color: "text-quartier-green",
  },
];

export function ExternalLinks() {
  const infraLinks = EXTERNAL_LINKS.filter((l) => l.group === "infra");
  const quickLinks = EXTERNAL_LINKS.filter((l) => l.group === "quick");

  return (
    <div className="space-y-6">
      {/* Infrastruktur */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-anthrazit">
          <Database className="h-4 w-4 text-emerald-600" />
          Infrastruktur
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {infraLinks.map((link) => (
            <LinkCardComponent key={link.url} link={link} />
          ))}
        </div>
      </div>

      {/* Schnellzugriff */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-anthrazit">
          <Globe className="h-4 w-4 text-quartier-green" />
          Schnellzugriff
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <LinkCardComponent key={link.url} link={link} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkCardComponent({ link }: { link: LinkCard }) {
  const Icon = link.icon;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-md hover:border-quartier-green/30 active:scale-[0.98]"
    >
      <div className={`rounded-lg bg-muted p-2.5 ${link.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-anthrazit group-hover:text-quartier-green transition-colors">
          {link.label}
        </p>
        <p className="text-xs text-muted-foreground truncate">{link.description}</p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}
