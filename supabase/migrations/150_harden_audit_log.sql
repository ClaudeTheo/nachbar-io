-- Migration 150: org_audit_log haerten (Phase 1 / G4)
-- Zweck: UPDATE/DELETE fuer App-Rollen entziehen → append-only fuer Audit-Nachweis
-- Risiko: Null — verifiziert: kein UPDATE/DELETE auf org_audit_log im gesamten Code

REVOKE UPDATE, DELETE ON org_audit_log FROM authenticated, anon;
