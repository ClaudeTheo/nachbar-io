import {
  StickyNav,
  Hero,
  AudienceTabs,
  PricingOverview,
  TrustBar,
  CTASection,
  LandingFooter,
} from "@/components/landing";

// Statisch gerendert: Kein dynamischer Content, beste Performance
export const dynamic = "force-static";

function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QuartierApp",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "Die App, die Nachbarschaften verbindet — für Bewohner, Angehörige, Pflege und Kommunen.",
    url: "https://nachbar-io.vercel.app",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Kostenlos in der Pilot-Phase",
    },
    provider: {
      "@type": "Organization",
      name: "QuartierApp",
      url: "https://nachbar-io.vercel.app",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bad Säckingen",
        addressCountry: "DE",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function LandingPage() {
  return (
    <>
      <StructuredData />
      <StickyNav />
      <main>
        <Hero />
        <AudienceTabs />
        <PricingOverview />
        <TrustBar />
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
}
