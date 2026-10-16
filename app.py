from datetime import datetime
from flask import Flask, jsonify, render_template, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///tasks.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    deadline = db.Column(db.String(10), nullable=True)  # YYYY-MM-DD
    status = db.Column(db.String(20), nullable=False, default="Pending")
    priority = db.Column(db.String(10), nullable=False, default="Medium")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        today = datetime.now().date().isoformat()
        overdue = bool(self.deadline and self.deadline < today and self.status != "Completed")
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "deadline": self.deadline,
            "status": self.status,
            "priority": self.priority,
            "overdue": overdue,
            "created_at": self.created_at.isoformat(timespec="seconds") + "Z",
        }


VALID_STATUSES = {"Pending", "Completed"}
VALID_PRIORITIES = {"Low", "Medium", "High"}


def validate_payload(data, partial=False):
    if not isinstance(data, dict):
        return "Request body must be a JSON object."
    if not partial or "title" in data:
        title = data.get("title")
        if not isinstance(title, str) or not title.strip():
            return "Task title is required."
        if len(title.strip()) > 200:
            return "Task title must be 200 characters or fewer."
    if "description" in data and not isinstance(data["description"], str):
        return "Description must be text."
    if "deadline" in data and data["deadline"] not in (None, ""):
        try:
            datetime.strptime(data["deadline"], "%Y-%m-%d")
        except (TypeError, ValueError):
            return "Deadline must use YYYY-MM-DD format."
    if "status" in data and data["status"] not in VALID_STATUSES:
        return "Status must be Pending or Completed."
    if "priority" in data and data["priority"] not in VALID_PRIORITIES:
        return "Priority must be Low, Medium, or High."
    return None


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/tasks")
def get_tasks():
    status = request.args.get("status", "all")
    search = request.args.get("search", "").strip()
    query = Task.query
    if status in VALID_STATUSES:
        query = query.filter(Task.status == status)
    elif status != "all":
        return jsonify({"error": "Filter must be all, Pending, or Completed."}), 400
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])


@app.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True)
    error = validate_payload(data)
    if error:
        return jsonify({"error": error}), 400
    task = Task(
        title=data["title"].strip(),
        description=data.get("description", "").strip(),
        deadline=data.get("deadline") or None,
        status=data.get("status", "Pending"),
        priority=data.get("priority", "Medium"),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@app.get("/api/tasks/<int:task_id>")
def get_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found."}), 404
    return jsonify(task.to_dict())


@app.put("/api/tasks/<int:task_id>")
def replace_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found."}), 404
    data = request.get_json(silent=True)
    error = validate_payload(data)
    if error:
        return jsonify({"error": error}), 400
    task.title = data["title"].strip()
    task.description = data.get("description", "").strip()
    task.deadline = data.get("deadline") or None
    task.status = data.get("status", "Pending")
    task.priority = data.get("priority", "Medium")
    db.session.commit()
    return jsonify(task.to_dict())


@app.patch("/api/tasks/<int:task_id>")
def update_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found."}), 404
    data = request.get_json(silent=True)
    error = validate_payload(data, partial=True)
    if error:
        return jsonify({"error": error}), 400
    if "title" in data:
        task.title = data["title"].strip()
    if "description" in data:
        task.description = data["description"].strip()
    if "deadline" in data:
        task.deadline = data["deadline"] or None
    if "status" in data:
        task.status = data["status"]
    if "priority" in data:
        task.priority = data["priority"]
    db.session.commit()
    return jsonify(task.to_dict())


@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    task = db.session.get(Task, task_id)
    if not task:
        return jsonify({"error": "Task not found."}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully."})


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True)
