const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
let isLogin = true;
let allTasks = [];

// Auth Toggles
function toggleAuth() {
    isLogin = !isLogin;
    document.getElementById('authTitle').innerText = isLogin ? 'Sign In' : 'Create Account';
    document.getElementById('phoneGroup').classList.toggle('hidden', isLogin);
    document.getElementById('authToggleText').innerHTML = isLogin ? "New here? <span>Create account</span>" : "Have account? <span>Sign In</span>";
}

function toggleModal(show) {
    document.getElementById('taskModal').classList.toggle('hidden', !show);
}

// Auth Submission
document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value;

    const res = await fetch(`${API_BASE}/api/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, phone })
    });

    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        initDashboard();
    } else if (!isLogin) {
        alert("Account Created! Please Login.");
        toggleAuth();
    } else {
        alert(data.error);
    }
});

// Dashboard Logic
async function initDashboard() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainDashboard').classList.remove('hidden');
    loadTasks();
}

async function loadTasks() {
    const res = await fetch(`${API_BASE}/api/tasks`, {
        headers: { 'Authorization': localStorage.getItem('token') }
    });
    allTasks = await res.json();
    renderTasks();
    updateAnalytics();
}

function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    allTasks.forEach(task => {
        list.innerHTML += `
            <div class="task-card ${task.priority} ${task.completed ? 'completed' : ''}">
                <div>
                    <h4 style="margin:0">${task.title}</h4>
                    <small style="color:var(--text-dim)">${task.description}</small>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="toggleComplete('${task._id}', ${!task.completed})" class="btn-gold" style="padding:5px 10px; font-size:11px">${task.completed ? 'Undo' : 'Done'}</button>
                    <button onclick="deleteTask('${task._id}')" style="background:none; border:none; color:#ff4444; cursor:pointer;">Delete</button>
                </div>
            </div>
        `;
    });
}

// const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
// let allTasks = [];
async function saveTask() {
    const payload = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDesc').value,
        priority: document.getElementById('taskPriority').value
    };

    await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
        body: JSON.stringify(payload)
    });
    toggleModal(false);
    loadTasks();
}

async function toggleComplete(id, status) {
    await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
        body: JSON.stringify({ completed: status })
    });
    loadTasks();
}

async function deleteTask(id) {
    await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': localStorage.getItem('token') }
    });
    loadTasks();
}

// AI and Analytics Logic
function updateAnalytics() {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    // Update Circle
    const path = document.getElementById('progressPath');
    path.style.strokeDasharray = `${percent}, 100`;
    document.getElementById('statPercent').innerText = `${percent}%`;

    // Aura AI Logic
    const aiText = document.getElementById('aiSuggestion');
    const pending = allTasks.filter(t => !t.completed);
    
    if (pending.length === 0) {
        aiText.innerText = "All clear! You are performing at peak potential. Take a break.";
    } else {
        const high = pending.find(t => t.priority === 'High');
        if (high) {
            aiText.innerText = `Priority Alert: Focus on "${high.title}" first. It's marked as critical for your progress.`;
        } else {
            aiText.innerText = `You have ${pending.length} pending tasks. Start with the oldest one to maintain momentum.`;
        }
    }
}

// --- Task Management Modals ---
function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveTaskBtn');
    
    modal.classList.remove('hidden');

    if (taskId) {
        title.innerText = "Refine Objective";
        saveBtn.innerText = "Update Objective";
        const task = allTasks.find(t => t._id === taskId);
        document.getElementById('editTaskId').value = task._id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDesc').value = task.description;
        document.getElementById('taskRemarks').value = task.remarks || '';
        document.getElementById('taskPriority').value = task.priority;
    } else {
        title.innerText = "Define Objective";
        saveBtn.innerText = "Confirm Objective";
        document.getElementById('editTaskId').value = '';
        document.getElementById('authForm').reset(); // Clear inputs
    }
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.add('hidden');
}

// --- Save / Update Task ---
async function saveTask() {
    const id = document.getElementById('editTaskId').value;
    const payload = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDesc').value,
        remarks: document.getElementById('taskRemarks').value,
        priority: document.getElementById('taskPriority').value
    };

    const method = id ? 'PATCH' : 'POST';
    const url = id ? `${API_BASE}/api/tasks/${id}` : `${API_BASE}/api/tasks`;

    const res = await fetch(url, {
        method: method,
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': localStorage.getItem('token') 
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        closeTaskModal();
        loadTasks();
    }
}

// --- Render Tasks with Management Pointers ---
function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';
    
    allTasks.forEach(task => {
        list.innerHTML += `
            <div class="task-card ${task.priority} ${task.completed ? 'completed' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3 style="margin:0">${task.title}</h3>
                    <span class="badge">${task.priority}</span>
                </div>
                <p style="color:var(--text-dim); font-size:14px; margin:5px 0;">${task.description}</p>
                
                ${task.remarks ? `<div class="remarks"><b>Remarks:</b> ${task.remarks}</div>` : ''}
                
                <div class="task-card-actions">
                    <button onclick="toggleComplete('${task._id}', ${!task.completed})" class="btn-gold" style="padding:6px 12px; font-size:11px;">
                        ${task.completed ? 'Reopen' : 'Complete'}
                    </button>
                    <button onclick="openTaskModal('${task._id}')" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px;">Edit</button>
                    <button onclick="deleteTask('${task._id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:12px;">Remove</button>
                </div>
            </div>
        `;
    });
}

// --- Analytics & AI (Previous Logic Optimized) ---
function updateAnalytics() {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('progressPath').style.strokeDasharray = `${percent}, 100`;
    document.getElementById('statPercent').innerText = `${percent}%`;

    const pending = allTasks.filter(t => !t.completed);
    const aiText = document.getElementById('aiSuggestion');
    
    if (pending.length > 0) {
        const priority = pending.find(t => t.priority === 'High') || pending[0];
        aiText.innerText = `Lumina suggests focusing on "${priority.title}". It aligns with your highest strategic value.`;
    } else {
        aiText.innerText = "Objectives clear. Systems operating at 100% efficiency.";
    }
}

// ... rest of loadTasks, auth, and logout functions ...
function logout() {
    localStorage.removeItem('token');
    location.reload();
}

if (localStorage.getItem('token')) initDashboard();