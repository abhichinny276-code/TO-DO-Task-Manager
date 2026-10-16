# To-Do Task Manager

## Requirements
- Python 3.10 or newer
- pip

## Run on Windows (VS Code terminal / PowerShell)
1. Open this folder in VS Code.
2. Create a virtual environment:
   `py -m venv .venv`
3. Activate it:
   `.venv\Scripts\Activate.ps1`
   If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and try again.
4. Install packages:
   `python -m pip install -r requirements.txt`
5. Start the application:
   `python app.py`
6. Open `http://127.0.0.1:5000` in your browser.

The SQLite database is created automatically when the app starts. Keep the terminal running while using the website.

## REST API
Base URL: `http://127.0.0.1:5000`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks?status=Pending` | Filter by status |
| GET | `/api/tasks?search=report` | Search title/description |
| GET | `/api/tasks/1` | Get one task |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/1` | Replace task fields |
| PATCH | `/api/tasks/1` | Update selected fields, e.g. status |
| DELETE | `/api/tasks/1` | Delete task |

### Example POST JSON
```json
{
  "title": "Complete assignment",
  "description": "Finish the Flask project",
  "deadline": "2026-10-20",
  "priority": "High"
}
```

### Example PATCH JSON
```json
{
  "status": "Completed"
}
```

## Postman testing
1. Start Flask first.
2. Create a request to `http://127.0.0.1:5000/api/tasks`.
3. For create/update requests choose **Body > raw > JSON**.
4. Send POST with the example JSON above. Expected response: `201 Created`.
5. Send GET to list the task.
6. Send PATCH to `/api/tasks/1` with `{"status":"Completed"}`.
7. Send DELETE to `/api/tasks/1`.

Test invalid input by sending POST with `{"title":"   "}`; expected response is `400 Bad Request` with an error message.

## Notes
- Task data is stored in SQLite and persists across restarts.
- Overdue means the deadline is before today's date and the task is not completed.
- For production deployment, turn off Flask debug mode and use a production WSGI server. This starter project is intended for local development.
