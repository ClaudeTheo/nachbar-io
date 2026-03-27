'use client';

// Formular zum Erstellen einer Einkaufsliste
// Dynamische Artikel-Liste mit Name + Menge, optionale Notiz und Faelligkeitsdatum

import { useState } from 'react';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';

interface ShoppingItem {
  name: string;
  quantity: string;
}

interface ShoppingRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MAX_ITEMS = 30;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function ShoppingRequestForm({ onSuccess, onCancel }: ShoppingRequestFormProps) {
  const [items, setItems] = useState<ShoppingItem[]>([{ name: '', quantity: '' }]);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Artikel hinzufügen
  function addItem() {
    if (items.length >= MAX_ITEMS) return;
    setItems([...items, { name: '', quantity: '' }]);
  }

  // Artikel entfernen
  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  // Artikel-Feld aktualisieren
  function updateItem(index: number, field: keyof ShoppingItem, value: string) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  // Formular absenden
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-seitige Validierung
    const validItems = items.filter((item) => item.name.trim().length > 0);
    if (validItems.length === 0) {
      setError('Bitte geben Sie mindestens einen Artikel an.');
      return;
    }

    for (const item of validItems) {
      if (item.name.trim().length > 200) {
        setError('Artikelname darf maximal 200 Zeichen lang sein.');
        return;
      }
      if (item.quantity.trim().length > 50) {
        setError('Mengenangabe darf maximal 50 Zeichen lang sein.');
        return;
      }
    }

    if (note.length > 500) {
      setError('Notiz darf maximal 500 Zeichen lang sein.');
      return;
    }

    setLoading(true);

    const payload = {
      items: validItems.map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity.trim(),
      })),
      note: note.trim() || undefined,
      due_date: dueDate || undefined,
    };

    try {
      const res = await fetch('/api/care/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Ein Fehler ist aufgetreten.');
        return;
      }

      onSuccess?.();
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Artikel-Liste */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-anthrazit">
          Einkaufsliste <span className="text-red-500">*</span>
        </label>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {/* Artikelname */}
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Artikel (z.B. Milch)"
                maxLength={200}
                required={index === 0}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                style={{ minHeight: '48px' }}
              />

              {/* Menge */}
              <input
                type="text"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                placeholder="Menge"
                maxLength={50}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
                style={{ minHeight: '48px' }}
              />

              {/* Entfernen-Button */}
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
                aria-label={`Artikel ${index + 1} entfernen`}
                className="flex shrink-0 items-center justify-center rounded-lg border border-gray-200 text-muted-foreground hover:bg-red-50 hover:text-red-500 active:bg-red-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                style={{ minHeight: '48px', minWidth: '48px', touchAction: 'manipulation' }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Artikel hinzufügen */}
        {items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-muted-foreground hover:border-quartier-green hover:text-quartier-green active:bg-gray-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            <Plus className="h-4 w-4" />
            Artikel hinzufügen ({items.length}/{MAX_ITEMS})
          </button>
        )}
      </div>

      {/* Notiz */}
      <div className="space-y-1.5">
        <label htmlFor="shopping-note" className="block text-sm font-medium text-anthrazit">
          Notiz <span className="text-xs font-normal text-muted-foreground">(optional, max. 500 Zeichen)</span>
        </label>
        <textarea
          id="shopping-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="z.B. Bitte laktosefreie Milch, wenn verfügbar..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit placeholder:text-gray-400 focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green resize-none"
        />
      </div>

      {/* Faelligkeitsdatum */}
      <div className="space-y-1.5">
        <label htmlFor="shopping-due-date" className="block text-sm font-medium text-anthrazit">
          Gewuenscht bis <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="shopping-due-date"
          type="date"
          value={dueDate}
          min={todayISO()}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-anthrazit focus:border-quartier-green focus:outline-none focus:ring-1 focus:ring-quartier-green"
          style={{ minHeight: '48px' }}
        />
      </div>

      {/* Fehlermeldung */}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border-2 border-gray-300 py-3 text-sm font-medium text-anthrazit hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
            style={{ minHeight: '48px', touchAction: 'manipulation' }}
          >
            Abbrechen
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-quartier-green py-3 text-sm font-bold text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50"
          style={{ minHeight: '48px', touchAction: 'manipulation' }}
        >
          <ShoppingCart className="h-4 w-4" />
          {loading ? 'Wird gesendet...' : 'Einkaufsliste absenden'}
        </button>
      </div>
    </form>
  );
}
