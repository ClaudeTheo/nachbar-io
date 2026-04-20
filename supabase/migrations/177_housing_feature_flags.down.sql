-- Down 177: Hausverwaltungs-Feature-Flags entfernen

begin;

delete from public.feature_flags
  where key in (
    'HOUSING_MODULE_ENABLED',
    'HOUSING_REPORTS',
    'HOUSING_ANNOUNCEMENTS',
    'HOUSING_DOCUMENTS',
    'HOUSING_APPOINTMENTS',
    'HOUSING_SHADOW_QUARTER'
  );

commit;
