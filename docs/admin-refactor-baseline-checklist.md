# Admin Refactor Baseline Checklist

## Manual baseline before refactor

- [ ] Admin login success flow (`adminPing` + `adminLogin`)
- [ ] Admin login error flow (invalid token message)
- [ ] Import dictionaries by CSV
- [ ] Import maestro by CSV
- [ ] Preview dictionaries and maestro table with pagination
- [ ] Export CSVs (categories, types, classifications, maestro)
- [ ] Create campaign
- [ ] Edit campaign (disabled when `activatedOnce`)
- [ ] Activate campaign
- [ ] Open revisions tab
- [ ] Navigate to audit page (`/auditoria`)

## Post-refactor verification

Run the same checklist and compare behavior/text/disabled states.
