'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HelpRequest, HELP_CATEGORY_LABELS } from '@/modules/hilfe/services/types';

/** Emoji-Icons je Kategorie */
const CATEGORY_ICONS: Record<string, string> = {
  einkaufen: '🛒',
  begleitung: '🚶',
  haushalt: '🏠',
  garten: '🌱',
  technik: '💻',
  vorlesen: '📖',
  sonstiges: '❓',
};

/** Status-Farben und Labels */
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Offen', variant: 'default' },
  matched: { label: 'Vermittelt', variant: 'secondary' },
  completed: { label: 'Abgeschlossen', variant: 'outline' },
  cancelled: { label: 'Abgesagt', variant: 'destructive' },
};

interface HelpRequestCardProps {
  request: HelpRequest;
  onApply?: (id: string) => void;
  showApplyButton?: boolean;
}

/** Karte für ein einzelnes Hilfe-Gesuch (Senior-Mode: große Schrift, 80px min-height) */
export function HelpRequestCard({ request, onApply, showApplyButton = true }: HelpRequestCardProps) {
  const icon = CATEGORY_ICONS[request.category] ?? '❓';
  const label = HELP_CATEGORY_LABELS[request.category] ?? request.category;
  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.open;

  // Beschreibung auf 100 Zeichen kürzen
  const description = request.description
    ? request.description.length > 100
      ? request.description.slice(0, 100) + '…'
      : request.description
    : 'Keine Beschreibung';

  return (
    <Card className="min-h-[80px] border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl" aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </CardTitle>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="text-base text-gray-700">{description}</p>
        {request.preferred_time && (
          <p className="text-sm text-gray-500">
            Wunschzeit: {request.preferred_time}
          </p>
        )}
      </CardContent>

      {showApplyButton && request.status === 'open' && onApply && (
        <CardFooter>
          <Button
            className="min-h-[48px] w-full text-base font-semibold"
            onClick={() => onApply(request.id)}
          >
            Ich helfe
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
