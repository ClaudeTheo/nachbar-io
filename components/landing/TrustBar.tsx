import { Shield, Leaf, MapPin, Flag, Eye } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: "DSGVO-konform",
    text: "EU-Hosting Frankfurt, AES-256",
  },
  {
    icon: <Flag className="h-6 w-6" />,
    title: "Kein Medizinprodukt",
    text: "Organisations- & Kommunikationstool",
  },
  {
    icon: <Leaf className="h-6 w-6" />,
    title: "Open Data",
    text: "OpenStreetMap, keine Google-Tracker",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: "Made in Germany",
    text: "Entwickelt in Bad Säckingen",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Barrierearm",
    text: "80px Touch-Targets, 4.5:1 Kontrast",
  },
];

export function TrustBar() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <h2 className="text-center text-2xl font-extrabold text-[#2D3142] sm:text-3xl">
        Vertrauen ist unser Fundament
      </h2>
      <div className="mt-12 grid gap-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#4CAF87]/10 text-[#4CAF87]">
              {item.icon}
            </div>
            <h3 className="mt-3 text-sm font-bold text-[#2D3142]">{item.title}</h3>
            <p className="mt-1 text-xs text-gray-500">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
