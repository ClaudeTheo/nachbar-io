-- Rollback fuer 198_users_and_youth_update_restrictions.sql
-- Hinweis: nach Rollback ist die ADM-3 + YOUTH-1 Privilege-Escalation wieder offen.
-- Nur ausfuehren wenn der Trigger einen unerwarteten Konflikt verursacht.

DROP TRIGGER IF EXISTS trg_users_update_restrictions ON users;
DROP TRIGGER IF EXISTS trg_youth_profiles_update_restrictions ON youth_profiles;
DROP FUNCTION IF EXISTS enforce_user_update_restrictions();
DROP FUNCTION IF EXISTS enforce_youth_profiles_update_restrictions();
