// components/youth/BadgeCard.tsx
// Jugend-Modul: Badge-Karte mit earned/locked State

interface BadgeCardProps {
  title: string;
  description: string;
  earned: boolean;
  iconUrl?: string;
  earnedAt?: string;
}

export function BadgeCard({ title, description, earned, iconUrl, earnedAt }: BadgeCardProps) {
  return (
    <div
      className={`p-4 rounded-xl border-2 transition-all ${
        earned
          ? 'border-green-400 bg-green-50'
          : 'border-gray-200 bg-gray-50 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          earned ? 'bg-green-200' : 'bg-gray-200'
        }`}>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt="" className="w-8 h-8" />
          ) : (
            <span aria-hidden="true">{earned ? '🏅' : '🔒'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-anthrazit">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
          {earned && earnedAt && (
            <p className="text-xs text-green-600 mt-2">
              Verdient am {new Date(earnedAt).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
