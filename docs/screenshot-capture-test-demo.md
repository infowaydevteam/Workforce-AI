# Screenshot Capture Test and Demo Plan

## Test Coverage

### Backend/API

- `POST /api/screenshots/upload`
  - Valid `agent_token` can upload a screenshot.
  - Missing or invalid `agent_token` is rejected.
  - Upload is rejected if `employee_id` does not match the `agent_token`.
  - Non-image files are rejected.
  - Oversized files are rejected.
  - Successful upload creates screenshot metadata in the database.
  - Stored file is encrypted and cannot be opened directly as JPG/PNG.

- `GET /api/screenshots`
  - Super Admin can list screenshots for all employees.
  - `employee_id` filter works correctly.
  - `from` / `to` date range filter works correctly.
  - Pagination works correctly.
  - Unauthorized requests are rejected.

- `GET /api/screenshots/:id/image`
  - Super Admin can open screenshot images.
  - Unauthorized requests are rejected.
  - Image response does not expose local file paths.
  - Each image view creates an audit log entry.

- Cleanup job
  - Screenshots older than 30 days are deleted.
  - Recent screenshots are not deleted.
  - Both encrypted files and database metadata are cleaned up.

### Agent

- `screenshot_interval_seconds = 0` disables screenshot capture.
- Positive interval automatically captures screenshots in the background.
- Very small intervals are clamped to a safe minimum, for example 60 seconds.
- Upload failure does not crash the agent.
- Slow uploads do not block existing activity tracking.
- macOS temporary screenshot files are deleted after upload.
- Screenshot capture does not show popups, steal focus, or disrupt employee work.

### Frontend

- Reports contains a Screenshots view/tab.
- Screenshots can be filtered by employee.
- Screenshots can be filtered by date range.
- Screenshot list shows employee name, capture date, and timestamp.
- Clicking a screenshot opens a preview/image view.
- Loading, empty, and error states display correctly.
- Super Admin can access the screenshots view.

## Items Requiring Manual Review

- Confirm the screenshot actually captures the employee's current screen.
- Confirm image quality is readable after compression.
- Confirm screenshot timestamp matches the expected capture time.
- Confirm Reports filtering feels usable.
- Confirm image preview opens quickly and is not distorted.
- Confirm screenshot capture does not interrupt the employee's work.
- Confirm the stored file cannot be opened directly from the backend storage directory.
- Confirm the image can only be viewed through the authorized backend API.
- Confirm audit logs include the correct viewer, screenshot ID, employee, timestamp, action, IP, and user-agent.
- Confirm cleanup does not delete recent screenshots.

## Demo Flow

1. Log in as Super Admin.

2. Open Employees and choose one employee.
   - Copy that employee's `agent_token`.

3. Create or update the local agent config:

   ```json
   {
     "agent_token": "EMPLOYEE_AGENT_TOKEN_HERE",
     "api_base_url": "http://localhost:5001"
   }
   ```

4. Run the macOS agent script from Terminal instead of installing the unsigned `.pkg`:

   ```bash
   IWF_AGENT_CONFIG=/path/to/config.json node scripts/mac-agent.mjs
   ```

5. If macOS asks for Screen Recording permission:
   - Open System Settings.
   - Go to Privacy & Security > Screen Recording.
   - Enable permission for Terminal.
   - Restart Terminal and run the script again.

6. In the Super Admin UI, open Policies.
   - Set `Screenshot Interval` to `60` seconds.
   - Save the policy.

7. Wait for one or two capture intervals.
   - The Terminal agent should continue running in the background.
   - Screenshot upload should happen automatically.

8. Open Reports > Screenshots.

9. Filter screenshots:
   - Select the employee.
   - Select today's date range.
   - Run the search/filter.

10. Open a screenshot preview.
    - Confirm the image displays.
    - Confirm no backend file path is exposed.

11. Verify audit logging.
    - Check that the screenshot search/view action was recorded.
    - Confirm viewer, employee, screenshot ID, action, and timestamp are correct.

12. Verify secure storage.
    - Open the backend screenshot storage directory.
    - Try to open the stored file directly.
    - It should not open as a normal image because it is encrypted.
    - Confirm the same screenshot opens correctly through the authorized Reports UI.

## Demo Summary

Super Admin configures screenshot interval, the macOS script runs from Terminal using the employee agent token, screenshots upload automatically, Super Admin views them in Reports by employee/date, and the system records audit logs and stores files encrypted.
