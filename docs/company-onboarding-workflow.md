# Company Onboarding Workflow

## Workflow

Company Onboarding covers:

1. Create Organization
2. Select Subscription Plan
3. Configure Timezone
4. Configure Working Hours
5. Configure Holidays
6. Configure Attendance Rules

## Demo Path

1. Login as `admin.demo@acme.example` with password `Demo@1234`.
2. Open `Admin > Onboarding`.
3. Select `Acme Workforce Demo`.
4. Show the workflow progress cards.
5. Review or edit:
   - Organization name and description
   - Subscription plan
   - Timezone
   - Working days and hours
   - Holiday calendar
   - Attendance rules
6. Click `Complete Onboarding`.

## Reset Demo Data

```bash
PGPASSWORD=workforce_pass /opt/homebrew/opt/postgresql@18/bin/psql \
  -h localhost -p 5432 -U workforce_user -d IWF \
  -f backend/sql/level1_demo_seed.sql
```
