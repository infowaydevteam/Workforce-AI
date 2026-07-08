# Level 1 Demo Strategy

## Goal

Show the complete platform path from company onboarding to executive analytics in one controlled demo:

Company signup -> tenant creation -> organization setup -> departments -> teams -> manager assignment -> employee invites -> agent install -> login/session -> activity sync -> classification -> productivity -> reports -> manager review -> HR review -> executive analytics.

## Demo Setup

1. Start the backend and frontend.
2. If no admin exists, use `Create Company` on the login screen to create the tenant and first admin.
3. Login as an admin.
4. Open `Admin > Level 1 Flow`.
5. Click `Seed Demo`.
6. Confirm the progress card reaches 100%.

The seed creates an `Acme Workforce Demo` tenant with departments, teams, manager, HR, executive, employees, sessions, activity logs, classifications, productivity scores, and review records.

## Talk Track

1. Open `Level 1 Flow` and show the full milestone list.
2. Open `Employees` and show invited employees, departments, managers, and agent download/install state.
3. Open one employee detail page and show sessions, app usage, classified activity, and productivity.
4. Open `Reports`, generate a report for `Ava Analyst`, and show productivity plus manager/HR review history.
5. Return to `Level 1 Flow` and show organization, department, app classification, and executive analytics summaries.

## Demo Credentials

After `Seed Demo`, the page displays the demo accounts. Default password:

```text
Demo@1234
```

Primary admin:

```text
admin.demo@acme.example
```

## Recovery

If a demo run becomes messy, click `Seed Demo` again. It refreshes the demo users' sessions, activities, idle logs, and reviews while preserving the tenant structure.
