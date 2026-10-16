const API = "/api/tasks";
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const form = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const deadlineInput = document.getElementById("deadline");
const priorityInput = document.getElementById("priority");
const formError = document.getElementById("formError");
const submitButton = document.getElementById("submitButton");
const cancelEdit = document.getElementById("cancelEdit");
const formHeading = document.getElementById("formHeading");
const filterSelect = document.getElementById("filterSelect");
const searchInput = document.getElementById("searchInput");
let editingId = null;
let searchTimer = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Something went wrong. Please try again.");
  return payload;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(date) {
  if (!date) return "No deadline";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function renderTask(task) {
  const completed = task.status === "Completed";
  const priorityClass = `priority-${task.priority.toLowerCase()}`;
  return `
    <article class="task-card ${completed ? "completed" : ""}" data-id="${task.id}">
      <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} completed" ${completed ? "checked" : ""} data-action="toggle">
      <div class="task-content">
        <div class="task-heading">
          <div class="task-main">
            <p class="task-title">${escapeHTML(task.title)}</p>
          </div>
          <div class="task-actions">
            <button class="icon-button" type="button" title="Edit task" aria-label="Edit task" data-action="edit">✎</button>
            <button class="icon-button delete" type="button" title="Delete task" aria-label="Delete task" data-action="delete">×</button>
          </div>
        </div>
        ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
        <div class="task-meta">
          <span class="chip ${priorityClass}">${escapeHTML(task.priority)} priority</span>
          <span class="chip ${task.overdue ? "overdue" : ""}">${task.overdue ? "Overdue · " : ""}◷ ${escapeHTML(formatDate(task.deadline))}</span>
          <span class="chip">${escapeHTML(task.status)}</span>
        </div>
      </div>
    </article>`;
}

async function loadTasks() {
  taskList.innerHTML = '<p class="task-description">Loading tasks...</p>';
  try {
    const params = new URLSearchParams({
      status: filterSelect.value,
      search: searchInput.value.trim()
    });
    const tasks = await api(`${API}?${params}`);
    taskList.innerHTML = tasks.map(renderTask).join("");
    emptyState.classList.toggle("hidden", tasks.length !== 0);
    document.getElementById("visibleCount").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

    const allTasks = await api(API);
    document.getElementById("totalCount").textContent = allTasks.length;
    document.getElementById("pendingCount").textContent = allTasks.filter(t => t.status === "Pending").length;
    document.getElementById("completedCount").textContent = allTasks.filter(t => t.status === "Completed").length;
  } catch (error) {
    taskList.innerHTML = "";
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent = "Could not load tasks";
    emptyState.querySelector("p").textContent = error.message;
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  priorityInput.value = "Medium";
  formHeading.textContent = "Create a task";
  submitButton.textContent = "＋ Add task";
  cancelEdit.classList.add("hidden");
  formError.textContent = "";
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  formError.textContent = "";
  const title = titleInput.value.trim();
  if (!title) {
    formError.textContent = "Please enter a task title.";
    titleInput.focus();
    return;
  }
  const body = {
    title,
    description: descriptionInput.value.trim(),
    deadline: deadlineInput.value || null,
    priority: priorityInput.value
  };
  try {
    if (editingId !== null) {
      await api(`${API}/${editingId}`, { method: "PUT", body: JSON.stringify({ ...body, status: window.editingStatus || "Pending" }) });
    } else {
      await api(API, { method: "POST", body: JSON.stringify(body) });
    }
    resetForm();
    await loadTasks();
  } catch (error) {
    formError.textContent = error.message;
  }
});

cancelEdit.addEventListener("click", resetForm);

taskList.addEventListener("click", async event => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const card = control.closest("[data-id]");
  const id = card?.dataset.id;
  if (!id) return;
  const action = control.dataset.action;
  try {
    if (action === "edit") {
      const task = await api(`${API}/${id}`);
      editingId = task.id;
      window.editingStatus = task.status;
      titleInput.value = task.title;
      descriptionInput.value = task.description || "";
      deadlineInput.value = task.deadline || "";
      priorityInput.value = task.priority;
      formHeading.textContent = "Edit task";
      submitButton.textContent = "Save changes";
      cancelEdit.classList.remove("hidden");
      formError.textContent = "";
      titleInput.focus();
      document.querySelector(".form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (action === "delete") {
      if (!confirm("Delete this task? This cannot be undone.")) return;
      await api(`${API}/${id}`, { method: "DELETE" });
      if (String(editingId) === String(id)) resetForm();
      await loadTasks();
    }
  } catch (error) {
    alert(error.message);
  }
});

taskList.addEventListener("change", async event => {
  if (event.target.dataset.action !== "toggle") return;
  const card = event.target.closest("[data-id]");
  try {
    await api(`${API}/${card.dataset.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: event.target.checked ? "Completed" : "Pending" })
    });
    await loadTasks();
  } catch (error) {
    alert(error.message);
    await loadTasks();
  }
});

filterSelect.addEventListener("change", loadTasks);
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTasks, 250);
});

loadTasks();
