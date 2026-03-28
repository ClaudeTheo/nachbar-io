import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// -------------------------------------------------------------------
// Navigationsleiste (Zurück / Weiter / Erstellen)
// -------------------------------------------------------------------

interface WizardNavProps {
  currentStep: number;
  saving: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardNav({ currentStep, saving, onBack, onNext, onSubmit }: WizardNavProps) {
  return (
    <>
      <Separator />
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Zurück
        </Button>

        {currentStep < 5 ? (
          <Button
            onClick={onNext}
            className="bg-quartier-green hover:bg-quartier-green-dark"
          >
            Weiter
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={saving}
            className="bg-quartier-green hover:bg-quartier-green-dark"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wird erstellt...
              </>
            ) : (
              "Quartier erstellen"
            )}
          </Button>
        )}
      </div>
    </>
  );
}
