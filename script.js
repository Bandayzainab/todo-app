const MAX_TASKS = 10; // change to allow more or fewer tasks
const STORAGE_KEY = "taskboard-tasks";

const taskInput = document.getElementById("taskInput");
const imgInput = document.getElementById("imgInput");
const previewBox = document.getElementById("preview");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const msg = document.getElementById("msg");
const list = document.getElementById("list");
const progressText = document.getElementById("progressText");
const ring = document.querySelector(".ring");
const ringText = document.getElementById("ringText");

let tasks = loadTasks();
let editingId = null;
let currentImage = null;
let filter = "all";

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  catch { msg.textContent = "Storage is full. Try a smaller image."; }
}

// Shrink images so they fit in localStorage
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, 700 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showPreview() {
  previewBox.innerHTML = "";
  if (!currentImage) return;
  const wrap = document.createElement("div");
  wrap.className = "preview";
  wrap.innerHTML = `<img src="${currentImage}" alt="Selected image"><button aria-label="Remove image">×</button>`;
  wrap.querySelector("button").onclick = () => {
    currentImage = null;
    imgInput.value = "";
    showPreview();
  };
  previewBox.appendChild(wrap);
}

function resetForm() {
  editingId = null;
  currentImage = null;
  taskInput.value = "";
  imgInput.value = "";
  saveBtn.textContent = "Add task";
  cancelBtn.hidden = true;
  showPreview();
}

function submitTask() {
  const text = taskInput.value.trim();
  if (!text) { msg.textContent = "Type a task first."; return; }

  if (editingId !== null) {
    const task = tasks.find(t => t.id === editingId);
    if (task) { task.text = text; task.image = currentImage; }
  } else {
    if (tasks.length >= MAX_TASKS) {
      msg.textContent = `Limit reached: ${MAX_TASKS} tasks. Delete one to add more.`;
      return;
    }
    tasks.push({ id: Date.now(), text, image: currentImage, done: false });
  }
  msg.textContent = "";
  saveTasks();
  resetForm();
  render();
}

function startEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  taskInput.value = task.text;
  currentImage = task.image;
  saveBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  showPreview();
  taskInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  progressText.textContent = `${done} of ${tasks.length} done`;
  ring.style.setProperty("--p", pct);
  ringText.textContent = pct + "%";

  const visible = tasks.filter(t =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done);

  list.innerHTML = "";
  if (!visible.length) {
    list.innerHTML = `<li class="empty">${tasks.length ? "Nothing in this view." : "No tasks yet. Add your first one above."}</li>`;
    return;
  }

  visible.forEach(task => {
    const li = document.createElement("li");
    li.className = "item" + (task.done ? " done" : "");

    const main = document.createElement("div");
    main.className = "item-main";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "check";
    cb.checked = task.done;
    cb.setAttribute("aria-label", "Mark as done");
    cb.onchange = () => { task.done = cb.checked; saveTasks(); render(); };
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = task.text;
    main.append(cb, title);
    li.appendChild(main);

    if (task.image) {
      const img = document.createElement("img");
      img.className = "photo";
      img.src = task.image;
      img.alt = "Image for " + task.text;
      li.appendChild(img);
    }

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const edit = document.createElement("button");
    edit.className = "btn ghost small";
    edit.textContent = "Edit";
    edit.onclick = () => startEdit(task.id);
    const del = document.createElement("button");
    del.className = "btn ghost small del";
    del.textContent = "Delete";
    del.onclick = () => {
      tasks = tasks.filter(t => t.id !== task.id);
      if (editingId === task.id) resetForm();
      saveTasks();
      render();
    };
    actions.append(edit, del);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

imgInput.addEventListener("change", async () => {
  const file = imgInput.files[0];
  if (!file) return;
  try {
    currentImage = await readImage(file);
    msg.textContent = "";
    showPreview();
  } catch { msg.textContent = "Couldn't read that image."; }
});
saveBtn.addEventListener("click", submitTask);
cancelBtn.addEventListener("click", () => { msg.textContent = ""; resetForm(); });
taskInput.addEventListener("keydown", e => { if (e.key === "Enter") submitTask(); });
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelector(".chip.active").classList.remove("active");
    chip.classList.add("active");
    filter = chip.dataset.filter;
    render();
  });
});

render();