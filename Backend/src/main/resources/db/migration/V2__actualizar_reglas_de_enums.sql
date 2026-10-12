-- En bases creadas por Hibernate, estas reglas pueden haber quedado con los valores viejos de cada enum
-- (por ejemplo, email_tokens sin RESET_PASSWORD). Se rehacen con los valores actuales.
-- En una base nueva (creada por V1) ya están bien, y esto las deja igual.

ALTER TABLE email_tokens DROP CONSTRAINT IF EXISTS email_tokens_type_check;
ALTER TABLE email_tokens ADD CONSTRAINT email_tokens_type_check
    CHECK (type IN ('VERIFY_EMAIL', 'RESET_PASSWORD'));

ALTER TABLE queue DROP CONSTRAINT IF EXISTS queue_status_check;
ALTER TABLE queue ADD CONSTRAINT queue_status_check
    CHECK (status IN ('PENDING', 'PLAYING', 'PLAYED', 'SKIPPED'));

ALTER TABLE cooldowns DROP CONSTRAINT IF EXISTS cooldowns_type_check;
ALTER TABLE cooldowns ADD CONSTRAINT cooldowns_type_check
    CHECK (type IN ('SONG', 'ARTIST'));
