// Barrel-Export fuer das onboarding-Modul

// Hauptkomponente
export { OnboardingFlow } from "@/modules/onboarding/components/OnboardingFlow";

// Hilfskomponenten
export { ConfettiEffect } from "@/modules/onboarding/components/ConfettiEffect";
export { ProgressDots } from "@/modules/onboarding/components/ProgressDots";
export { SlideSkills } from "@/modules/onboarding/components/SlideSkills";

// Slides (aktiv im Flow)
export { SlideWelcome } from "@/modules/onboarding/components/slides/SlideWelcome";
export { SlideEmergency } from "@/modules/onboarding/components/slides/SlideEmergency";
export { default as SlideVideo } from "@/modules/onboarding/components/slides/SlideVideo";
export { SlideReady } from "@/modules/onboarding/components/slides/SlideReady";

// Slides (archiviert — nicht mehr im Haupt-Flow, aber für spätere Nutzung verfügbar)
export { SlideCommunity } from "@/modules/onboarding/components/slides/SlideCommunity";
export { SlideHelp } from "@/modules/onboarding/components/slides/SlideHelp";
export { SlideMap } from "@/modules/onboarding/components/slides/SlideMap";
export { SlideMarketplace } from "@/modules/onboarding/components/slides/SlideMarketplace";
export { SlidePush } from "@/modules/onboarding/components/slides/SlidePush";
export { SlideSetPosition } from "@/modules/onboarding/components/slides/SlideSetPosition";

// Services
export { completeOnboarding, isOnboardingCompleted } from "@/modules/onboarding/services/onboarding";
