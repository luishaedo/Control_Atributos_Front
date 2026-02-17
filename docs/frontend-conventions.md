# Frontend conventions (Control_Atributos_Front)

## Imports

- Use explicit file extensions for local imports (`.js`, `.jsx`).
- Keep import style consistent across `src/services` and UI modules to reduce tooling ambiguity.

## API client usage

- Prefer shared helpers from `src/services/api.js` (`fetchJSON`, `fetchWithRetry` call path) instead of ad-hoc `fetch` per endpoint.
- Endpoint-specific behavior must be configured via helper options (timeouts, retry policy, `404 => null`, and error mapping) rather than duplicated request logic.

## Environment configuration

- `VITE_API_URL` is mandatory for all environments.
- Do not rely on runtime host fallbacks because they hide FE/BE split misconfiguration.

## Local identity storage

- Persist user identity in `cc_user` using envelope format: `{ version, savedAt, user }`.
- Keep backward-compatible read for legacy `{ email, sucursal }` shape.
- Auto-expire stale identities by TTL and provide explicit UI actions to change/clear identity.
