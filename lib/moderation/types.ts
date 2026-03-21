// Moderation-Typen fuer Content-Moderation und Reporting

export type ModerationChannel = 'board' | 'marketplace' | 'chat' | 'comment' | 'profile';
export type ModerationScore = 'green' | 'yellow' | 'red';
export type ReportReason = 'spam' | 'harassment' | 'hate' | 'scam' | 'inappropriate' | 'wrong_category' | 'other';
export type BlockLevel = 'mute' | 'block' | 'safety';
export type ModerationAction = 'warn' | 'mute' | 'temp_ban' | 'perm_ban';

export interface ModerationResult {
  score: ModerationScore;
  reason: string;
  confidence: number;
  flaggedCategories: string[];
}

export interface ContentForModeration {
  text: string;
  channel: ModerationChannel;
  authorId: string;
  contentId: string;
  contentType: string;
  imageUrls?: string[];
}
