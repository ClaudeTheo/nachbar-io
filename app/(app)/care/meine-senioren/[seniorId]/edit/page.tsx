// app/(app)/care/meine-senioren/[seniorId]/edit/page.tsx
// Nachbar.io — Angeh\u00f6rigen-Proxy: Profil eines Seniors bearbeiten
// Nur fuer verifizierte Helfer (relative, care_service) mit Zuordnung
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, UserCog, ShieldCheck, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarPicker } from '@/components/AvatarPicker';
import { useCareRole } from '@/lib/care/hooks/useCareRole';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface SeniorProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
}

export default function SeniorProfileEditPage() {
  const params = useParams();
  const router = useRouter();
  const seniorId = params.seniorId as string;
  const { role, loading: roleLoading } = useCareRole(seniorId);

  const { user } = useAuth();
  const [senior, setSenior] = useState<SeniorProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Berechtigungspruefung: nur relative oder care_service
  const canEdit = role === 'relative' || role === 'care_service' || role === 'admin';

  useEffect(() => {
    if (roleLoading) return;
    if (!canEdit) return;

    async function loadSenior() {
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, bio, phone')
        .eq('id', seniorId)
        .single();

      if (data) {
        setSenior(data);
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url);
        setBio(data.bio || '');
        setPhone(data.phone || '');
      }
      setLoading(false);
    }

    loadSenior();
  }, [seniorId, roleLoading, canEdit]);

  async function handleSave() {
    if (!senior || !displayName.trim()) return;
    setSaving(true);

    try {
      if (!user) throw new Error('Nicht eingeloggt');
      const supabase = createClient();

      // Profil-Update
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', seniorId);

      if (updateError) throw updateError;

      // Audit-Log: Wer hat was geaendert
      await supabase.from('org_audit_log').insert({
        user_id: user.id,
        action: 'caregiver_profile_edit',
        target_user_id: seniorId,
        details: {
          changed_fields: ['display_name', 'avatar_url', 'bio', 'phone'],
          editor_role: role,
        },
      });

      toast.success(`Profil von ${displayName} gespeichert`);
      router.push(`/care/meine-senioren/${seniorId}`);
    } catch (err) {
      console.error('Profil-Update Fehler:', err);
      toast.error('Profil konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  }

  // Ladezustand
  if (roleLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-quartier-green border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Profil wird geladen...</p>
      </div>
    );
  }

  // Keine Berechtigung
  if (!canEdit) {
    return (
      <div className="space-y-4 py-8 text-center">
        <TriangleAlert className="mx-auto h-12 w-12 text-alert-amber" />
        <h1 className="text-lg font-semibold text-anthrazit">Keine Berechtigung</h1>
        <p className="text-sm text-muted-foreground">
          Sie sind nicht berechtigt, dieses Profil zu bearbeiten.
          Nur zugewiesene Angehoerige und Pflegekraefte koennen Profile bearbeiten.
        </p>
        <Link
          href={`/care/meine-senioren/${seniorId}`}
          className="inline-flex items-center gap-1 text-sm text-quartier-green"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Profil bearbeiten"
        subtitle={`für ${senior?.display_name ?? ''}`}
        backHref={`/care/meine-senioren/${seniorId}`}
      />

      {/* Hinweis-Banner: Wessen Profil wird bearbeitet */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-medium text-blue-900">
            Sie bearbeiten das Profil von {senior?.display_name}
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            Alle Änderungen werden protokolliert. {senior?.display_name} kann die Berechtigung jederzeit widerrufen.
          </p>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <AvatarPicker
          currentAvatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
          userId={seniorId}
        />
        <p className="text-xs text-muted-foreground">Tippen zum Ändern</p>
      </div>

      {/* Formular */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-anthrazit">
            Name
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Vor- und Nachname"
            className="text-base"
            maxLength={100}
          />
        </div>

        {/* Telefon */}
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-anthrazit">
            Telefon
          </label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+49 ..."
            className="text-base"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-anthrazit">
            Über mich
          </label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 300))}
            placeholder="Ein paar Worte..."
            className="min-h-[80px] resize-none text-base"
            maxLength={300}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/300</p>
        </div>
      </div>

      {/* Speichern */}
      <Button
        onClick={handleSave}
        disabled={saving || !displayName.trim()}
        className="w-full bg-quartier-green text-white hover:bg-quartier-green-dark"
        size="lg"
      >
        {saving ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Wird gespeichert...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Profil speichern
          </div>
        )}
      </Button>

      {/* Datenschutz-Hinweis */}
      <p className="text-center text-[11px] text-muted-foreground">
        <UserCog className="mb-0.5 inline h-3 w-3" /> Proxy-Bearbeitung gemäß DSGVO Art. 6 Abs. 1a.
        Alle Änderungen werden im Audit-Log protokolliert.
      </p>
    </div>
  );
}
