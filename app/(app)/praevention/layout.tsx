import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prävention — Aktiv im Quartier",
  description:
    "ZPP-zertifizierter Präventionskurs: 8 Wochen Stressbewältigung mit KI-geführten Übungen und wöchentlichen Gruppeneinheiten.",
};

export default function PraeventionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
