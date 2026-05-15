    const modes = [
      { key: "youth", label: "Jugend" },
      { key: "active", label: "Aktiv" },
      { key: "comfort", label: "Komfort" },
      { key: "senior", label: "Einfach" }
    ];

    const decisions = [
      ["keep", "Lassen"],
      ["remove", "Entfernen"],
      ["later", "Später"],
      ["change", "Ändern"],
      ["unsure", "Unsicher"]
    ];

    const rows = [
      {
        id: "start",
        group: "Start & Orientierung",
        name: "Startseite",
        plain: "Die erste Seite nach dem Anmelden. Sie zeigt, was jetzt wichtig ist.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "mode-switch",
        group: "Start & Orientierung",
        name: "Oberfläche wechseln",
        plain: "Im Profil kann man zwischen Jugend, Aktiv, Komfort und Einfach wechseln.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "daily-overview",
        group: "Start & Orientierung",
        name: "Heute im Quartier",
        plain: "Kurzer Überblick über Wetter, Hinweise, Nachrichten und wichtige Dinge des Tages.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "notifications",
        group: "Start & Orientierung",
        name: "Benachrichtigungen",
        plain: "Hinweise, Antworten, Erinnerungen und neue Nachrichten.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "profile",
        group: "Start & Orientierung",
        name: "Mein Profil",
        plain: "Eigene Daten, Einstellungen, Oberfläche, Einladungen und Sicherheit.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "map",
        group: "Quartier & Karte",
        name: "Karte",
        plain: "Karte des Quartiers mit sicheren Punkten und ungefähren Orten.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "activity-pins",
        group: "Quartier & Karte",
        name: "Aktivitäts-Pins",
        plain: "Punkte auf der Karte für Lernen, Treffen, Hilfe, Warnungen oder Ereignisse.",
        current: { youth: "yes", active: "limited", comfort: "limited", senior: "no" },
        defaults: { youth: "keep", active: "change", comfort: "later", senior: "remove" }
      },
      {
        id: "quarter-info",
        group: "Quartier & Karte",
        name: "Quartier-Infos",
        plain: "Lokale Informationen wie Wetter, Warnungen, Müll, ÖPNV, Rathaus und Umgebung.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "waste",
        group: "Quartier & Karte",
        name: "Müllkalender",
        plain: "Zeigt, wann welche Tonne rausgestellt wird.",
        current: { youth: "no", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "remove", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "city-services",
        group: "Quartier & Karte",
        name: "Rathaus & Bekanntmachungen",
        plain: "Infos aus der Stadt oder Gemeinde, zum Beispiel Meldungen oder Dienste.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "later", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "warnings",
        group: "Sicherheit",
        name: "Warnungen",
        plain: "Unwetter, Hitze, Luft, offizielle Warnungen. Bei Gefahr steht 112/110 zuerst.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "emergency",
        group: "Sicherheit",
        name: "Notruf 112/110",
        plain: "Schneller Hinweis auf echte Notrufnummern bei Feuer, Medizin oder Gefahr.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "sos",
        group: "Sicherheit",
        name: "SOS in der App",
        plain: "Hilfe an vertraute Kontakte senden. Kein Ersatz für 112/110.",
        current: { youth: "risk", active: "limited", comfort: "limited", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "later", senior: "keep" }
      },
      {
        id: "bug",
        group: "Sicherheit",
        name: "Problem melden",
        plain: "Ein einfacher Knopf, um Fehler oder unklare Stellen in der App zu melden.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "board",
        group: "Nachbarschaft",
        name: "Schwarzes Brett",
        plain: "Nachbarn können Dinge mitteilen, fragen oder anbieten.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "later", active: "keep", comfort: "keep", senior: "remove" }
      },
      {
        id: "help",
        group: "Nachbarschaft",
        name: "Hilfe suchen",
        plain: "Eine kleine Bitte stellen, zum Beispiel Einkauf, Technik oder Garten.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "help-offer",
        group: "Nachbarschaft",
        name: "Hilfe anbieten",
        plain: "Selbst als Helfer sichtbar werden oder Aufgaben übernehmen.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "change", active: "keep", comfort: "later", senior: "remove" }
      },
      {
        id: "marketplace",
        group: "Nachbarschaft",
        name: "Marktplatz",
        plain: "Dinge anbieten oder suchen. Für Jugendliche kein Verkauf und kein Geld.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "remove" }
      },
      {
        id: "groups",
        group: "Nachbarschaft",
        name: "Gruppen",
        plain: "Geschützte Gruppen für Interessen, Treffen oder Nachbarschaftsthemen.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "keep", active: "keep", comfort: "change", senior: "remove" }
      },
      {
        id: "events",
        group: "Nachbarschaft",
        name: "Veranstaltungen",
        plain: "Termine, Treffen und Aktionen im Quartier.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "lending",
        group: "Nachbarschaft",
        name: "Leihbörse",
        plain: "Dinge verleihen oder ausleihen, zum Beispiel Werkzeug oder Geräte.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "remove" }
      },
      {
        id: "packages",
        group: "Nachbarschaft",
        name: "Pakete",
        plain: "Paketannahme oder Nachbarschaftshilfe rund um Lieferungen.",
        current: { youth: "no", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "remove", active: "keep", comfort: "keep", senior: "remove" }
      },
      {
        id: "lost-found",
        group: "Nachbarschaft",
        name: "Fundbüro",
        plain: "Gefundene oder verlorene Dinge im Quartier melden.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "remove" }
      },
      {
        id: "messages",
        group: "Kontakt & Familie",
        name: "Nachrichten",
        plain: "Direkte Nachrichten mit Nachbarn oder vertrauten Kontakten.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "circle",
        group: "Kontakt & Familie",
        name: "Mein Kreis",
        plain: "Familie, Angehörige oder vertraute Kontakte schnell erreichen.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "change", comfort: "keep", senior: "keep" }
      },
      {
        id: "video",
        group: "Kontakt & Familie",
        name: "Videoanruf",
        plain: "Eine vertraute Person per Video erreichen.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "keep", senior: "keep" }
      },
      {
        id: "write-help",
        group: "Kontakt & Familie",
        name: "Schreiben mit Hilfe",
        plain: "Die App hilft beim Formulieren einer Nachricht an vertraute Kontakte.",
        current: { youth: "risk", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "change", senior: "keep" }
      },
      {
        id: "family-setup",
        group: "Kontakt & Familie",
        name: "Angehörige verknüpfen",
        plain: "Eine vertraute Person darf bestimmte Dinge sehen, wenn es erlaubt wurde.",
        current: { youth: "risk", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "change", comfort: "keep", senior: "change" }
      },
      {
        id: "checkin",
        group: "Gesundheit & Alltag",
        name: "Täglicher Check-in",
        plain: "Kurz melden: Alles in Ordnung oder ich brauche Hilfe.",
        current: { youth: "no", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "care-status",
        group: "Gesundheit & Alltag",
        name: "Status für Angehörige",
        plain: "Angehörige sehen nur freigegebene Status-Informationen.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "keep", senior: "keep" }
      },
      {
        id: "appointments",
        group: "Gesundheit & Alltag",
        name: "Termine",
        plain: "Wichtige Termine sehen oder erinnern lassen.",
        current: { youth: "no", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "medications",
        group: "Gesundheit & Alltag",
        name: "Medikamente",
        plain: "Medikamente sehen und Einnahme bestätigen. Sensible Daten bleiben geschützt.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "keep", senior: "keep" }
      },
      {
        id: "shopping",
        group: "Gesundheit & Alltag",
        name: "Einkaufshilfe",
        plain: "Einkauf planen oder Hilfe beim Einkaufen anfragen.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "care-tasks",
        group: "Gesundheit & Alltag",
        name: "Aufgabentafel",
        plain: "Aufgaben für Unterstützung organisieren, zum Beispiel Erledigungen.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "no" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "remove" }
      },
      {
        id: "pflegegrad",
        group: "Gesundheit & Alltag",
        name: "Pflegegrad-Hilfe",
        plain: "Unterstützung beim Verstehen von Pflegegrad und möglichen Leistungen.",
        current: { youth: "no", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "remove", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "doctor",
        group: "Gesundheit & Alltag",
        name: "Sprechstunde / Arzt",
        plain: "Termine oder Kontakt zu medizinischen Angeboten, wenn freigeschaltet.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "limited" },
        defaults: { youth: "remove", active: "later", comfort: "keep", senior: "later" }
      },
      {
        id: "memory",
        group: "Privates & Gedächtnis",
        name: "Gedächtnis der App",
        plain: "Die App merkt sich freigegebene Dinge, damit Hilfe persönlicher wird.",
        current: { youth: "no", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "remove", active: "change", comfort: "change", senior: "change" }
      },
      {
        id: "ai-helper",
        group: "Privates & Gedächtnis",
        name: "KI-Assistent",
        plain: "Ein Helfer zum Formulieren, Erklären oder Erinnern. Muss ruhig und transparent sein.",
        current: { youth: "risk", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "remove", active: "change", comfort: "change", senior: "later" }
      },
      {
        id: "voice",
        group: "Privates & Gedächtnis",
        name: "Spracheingabe",
        plain: "Etwas sprechen statt tippen. Gut für Senior, aber sensibel.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "keep", senior: "keep" }
      },
      {
        id: "data-export",
        group: "Privates & Gedächtnis",
        name: "Daten ansehen oder löschen",
        plain: "Eigene Daten ansehen, exportieren oder löschen lassen.",
        current: { youth: "limited", active: "yes", comfort: "yes", senior: "limited" },
        defaults: { youth: "change", active: "keep", comfort: "keep", senior: "change" }
      },
      {
        id: "invite-code",
        group: "Registrierung & Zugang",
        name: "Hausnummer-Code",
        plain: "Mit dem Code aus dem Brief kommt man ins richtige Quartier.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "qr",
        group: "Registrierung & Zugang",
        name: "QR-Code im Brief",
        plain: "Mit der Handy-Kamera schnell zur richtigen Anmeldeseite.",
        current: { youth: "yes", active: "yes", comfort: "yes", senior: "yes" },
        defaults: { youth: "keep", active: "keep", comfort: "keep", senior: "keep" }
      },
      {
        id: "u18",
        group: "Registrierung & Zugang",
        name: "Jugendliche 14 bis 17",
        plain: "Dürfen eingeschränkt starten. Schutzregeln und Elternhinweis müssen klar sein.",
        current: { youth: "yes", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "change", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "under14",
        group: "Registrierung & Zugang",
        name: "Kinder unter 14",
        plain: "Sollen nicht selbstständig in die App kommen.",
        current: { youth: "no", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "remove", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "youth-missions",
        group: "Jugend extra",
        name: "Missionen",
        plain: "Altersgerechte Aufgaben: lernen, helfen, treffen. Nur leichte und sichere Aufgaben.",
        current: { youth: "yes", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "keep", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "youth-points",
        group: "Jugend extra",
        name: "Punkte und Badges",
        plain: "Belohnungen für erledigte Missionen. Keine Geldlogik.",
        current: { youth: "yes", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "keep", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "youth-exchange",
        group: "Jugend extra",
        name: "Tauschen und Schenken",
        plain: "Jugendliche können Dinge tauschen oder verschenken, ohne Verkauf.",
        current: { youth: "yes", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "keep", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "youth-groups",
        group: "Jugend extra",
        name: "Jugend-Gruppen",
        plain: "Geschützte Gruppen für Jugendliche, mit passenden Schutzregeln.",
        current: { youth: "yes", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "keep", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "youth-moderation",
        group: "Jugend extra",
        name: "Jugendschutz",
        plain: "Melden, sperren und ungeeignete Inhalte verhindern.",
        current: { youth: "yes", active: "no", comfort: "no", senior: "no" },
        defaults: { youth: "keep", active: "remove", comfort: "remove", senior: "remove" }
      },
      {
        id: "senior-tiles",
        group: "Einfach extra",
        name: "Vier große Kacheln",
        plain: "Mein Kreis, Hier bei mir, Schreiben, Notfall. Mehr soll auf der Startseite nicht stehen.",
        current: { youth: "no", active: "no", comfort: "no", senior: "yes" },
        defaults: { youth: "remove", active: "remove", comfort: "remove", senior: "keep" }
      },
      {
        id: "senior-large-targets",
        group: "Einfach extra",
        name: "Sehr große Tasten",
        plain: "Alles muss leicht antippbar sein. Besonders wichtig für ältere Menschen.",
        current: { youth: "no", active: "limited", comfort: "yes", senior: "yes" },
        defaults: { youth: "remove", active: "later", comfort: "keep", senior: "keep" }
      },
      {
        id: "senior-terminal",
        group: "Einfach extra",
        name: "Senioren-Gerät",
        plain: "Stationäres Gerät oder einfache App mit eigenem Startbildschirm.",
        current: { youth: "no", active: "no", comfort: "limited", senior: "yes" },
        defaults: { youth: "remove", active: "remove", comfort: "later", senior: "keep" }
      }
    ];

    const storageKey = "nachbar-io-ui-modi-entscheidungen-v1";
    const state = loadState();

    function labelForCurrent(value) {
      if (value === "yes") return "Aktuell sichtbar";
      if (value === "limited") return "Teilweise / anders";
      if (value === "risk") return "Nur mit Risiko";
      return "Aktuell nicht sichtbar";
    }

    function loadState() {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || "{}");
      } catch {
        return {};
      }
    }

    function saveState() {
      localStorage.setItem(storageKey, JSON.stringify(state));
      updateSummary();
    }

    function ensureRowState(row) {
      if (!state[row.id]) {
        state[row.id] = { decisions: {}, note: "" };
      }
      for (const mode of modes) {
        if (!state[row.id].decisions[mode.key]) {
          state[row.id].decisions[mode.key] = row.defaults[mode.key] || "unsure";
        }
      }
      return state[row.id];
    }

    function decisionSelect(row, mode) {
      const rowState = ensureRowState(row);
      const select = document.createElement("select");
      select.className = "decision " + rowState.decisions[mode.key];
      select.dataset.row = row.id;
      select.dataset.mode = mode.key;

      for (const [value, label] of decisions) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        option.selected = rowState.decisions[mode.key] === value;
        select.appendChild(option);
      }

      select.addEventListener("change", () => {
        rowState.decisions[mode.key] = select.value;
        select.className = "decision " + select.value;
        saveState();
        applyFilters();
      });

      return select;
    }

    function renderTable() {
      const body = document.getElementById("matrixBody");
      body.innerHTML = "";
      let lastGroup = "";

      for (const row of rows) {
        const rowState = ensureRowState(row);
        const tr = document.createElement("tr");
        tr.dataset.group = row.group;
        tr.dataset.search = (row.group + " " + row.name + " " + row.plain).toLowerCase();
        if (row.group !== lastGroup) {
          tr.dataset.groupStart = "true";
          lastGroup = row.group;
        }

        const groupTd = document.createElement("td");
        groupTd.className = "group";
        groupTd.textContent = row.group;
        tr.appendChild(groupTd);

        const nameTd = document.createElement("td");
        nameTd.className = "function";
        nameTd.textContent = row.name;
        tr.appendChild(nameTd);

        const plainTd = document.createElement("td");
        plainTd.className = "plain";
        plainTd.textContent = row.plain;
        tr.appendChild(plainTd);

        for (const mode of modes) {
          const td = document.createElement("td");
          td.className = "mode-cell";

          const badge = document.createElement("span");
          badge.className = "current " + row.current[mode.key];
          badge.textContent = labelForCurrent(row.current[mode.key]);
          td.appendChild(badge);
          td.appendChild(decisionSelect(row, mode));
          tr.appendChild(td);
        }

        const noteTd = document.createElement("td");
        noteTd.className = "note-cell";
        const note = document.createElement("textarea");
        note.placeholder = "Ihre Notiz zu dieser Funktion";
        note.value = rowState.note || "";
        note.addEventListener("input", () => {
          rowState.note = note.value;
          saveState();
        });
        noteTd.appendChild(note);
        tr.appendChild(noteTd);

        body.appendChild(tr);
      }

      saveState();
      renderGroupFilter();
      applyFilters();
    }

    function renderGroupFilter() {
      const select = document.getElementById("groupFilter");
      const previous = select.value;
      const groups = Array.from(new Set(rows.map((row) => row.group)));
      select.innerHTML = '<option value="all">Alle Bereiche</option>';
      for (const group of groups) {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        select.appendChild(option);
      }
      select.value = groups.includes(previous) ? previous : "all";
    }

    function hasOpenDecision(row) {
      const rowState = ensureRowState(row);
      return Object.values(rowState.decisions).some((value) => value === "change" || value === "unsure" || value === "later");
    }

    function applyFilters() {
      const q = document.getElementById("searchInput").value.trim().toLowerCase();
      const group = document.getElementById("groupFilter").value;
      const open = document.getElementById("openFilter").value;

      for (const tr of document.querySelectorAll("#matrixBody tr")) {
        const row = rows.find((item) => item.id === tr.querySelector("select")?.dataset.row);
        const matchesSearch = !q || tr.dataset.search.includes(q);
        const matchesGroup = group === "all" || tr.dataset.group === group;
        const matchesOpen = open === "all" || (row && hasOpenDecision(row));
        tr.hidden = !(matchesSearch && matchesGroup && matchesOpen);
      }
    }

    function updateSummary() {
      const lines = [];
      lines.push("Nachbar.io – Entscheidungen zu den 4 Oberflächen");
      lines.push("Stand: " + new Date().toLocaleString("de-DE"));
      lines.push("");

      for (const row of rows) {
        const rowState = ensureRowState(row);
        const changed = modes.some((mode) => rowState.decisions[mode.key] !== row.defaults[mode.key]);
        const hasNote = Boolean((rowState.note || "").trim());
        const open = hasOpenDecision(row);
        if (!changed && !hasNote && !open) continue;

        lines.push(row.group + " – " + row.name);
        lines.push("  Erklärung: " + row.plain);
        for (const mode of modes) {
          const value = rowState.decisions[mode.key];
          const label = decisions.find((item) => item[0] === value)?.[1] || value;
          lines.push("  " + mode.label + ": " + label);
        }
        if (hasNote) lines.push("  Notiz: " + rowState.note.trim());
        lines.push("");
      }

      if (lines.length <= 3) {
        lines.push("Noch keine abweichenden Entscheidungen. Bitte Auswahlen treffen oder Notizen schreiben.");
      }

      document.getElementById("summaryOutput").value = lines.join("\n");
    }

    async function copySummary() {
      updateSummary();
      const text = document.getElementById("summaryOutput").value;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("Zusammenfassung wurde kopiert. Sie können sie jetzt in den Chat einfügen.");
      } catch {
        document.getElementById("summaryOutput").select();
        setStatus("Kopieren über Browser nicht erlaubt. Text ist markiert, bitte Strg+C drücken.");
      }
    }

    function download(filename, text, type) {
      const blob = new Blob([text], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function downloadSummary() {
      updateSummary();
      download("nachbar-io-ui-modi-entscheidungen.txt", document.getElementById("summaryOutput").value, "text/plain;charset=utf-8");
      setStatus("Zusammenfassung wurde heruntergeladen.");
    }

    function downloadHtml() {
      const html = "<!doctype html>\n" + document.documentElement.outerHTML;
      download("nachbar-io-ui-modi-entscheidungsmatrix-bearbeitet.html", html, "text/html;charset=utf-8");
      setStatus("Bearbeitete HTML wurde heruntergeladen.");
    }

    function setStatus(message) {
      document.getElementById("statusLine").textContent = message;
      window.setTimeout(() => {
        if (document.getElementById("statusLine").textContent === message) {
          document.getElementById("statusLine").textContent = "";
        }
      }, 6000);
    }

    function resetAll() {
      if (!window.confirm("Alle Auswahlen und Notizen in diesem Browser löschen?")) return;
      localStorage.removeItem(storageKey);
      for (const key of Object.keys(state)) delete state[key];
      renderTable();
      setStatus("Alles wurde zurückgesetzt.");
    }

    document.getElementById("copySummary").addEventListener("click", copySummary);
    document.getElementById("downloadSummary").addEventListener("click", downloadSummary);
    document.getElementById("downloadHtml").addEventListener("click", downloadHtml);
    document.getElementById("resetAll").addEventListener("click", resetAll);
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("groupFilter").addEventListener("change", applyFilters);
    document.getElementById("openFilter").addEventListener("change", applyFilters);

    renderTable();
