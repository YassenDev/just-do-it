let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let completedTasks = [];
let remainingTasks = [];

const addTaskButton = document.getElementById("add-task-button");
const taskInput = document.getElementById("task-input");
const timeInput = document.getElementById("time-input");
const clearAllButton = document.getElementById("delete-all-tasks");
const taskList = document.getElementById("all-tasks");
const deleteSelectedButton = document.getElementById("delete-selected-tasks");

let currentEditId = null;

addTaskButton.addEventListener("click", addTask);
clearAllButton.addEventListener("click", clearAllTasks);
deleteSelectedButton.addEventListener("click", clearCompletedTasks);

document.addEventListener('click', (event) => {
    if (event.target.classList.contains('complete') || event.target.classList.contains('ci')) {
        toggleTaskCompletion(event);
    }
    if (event.target.classList.contains('delete') || event.target.classList.contains('di')) {
        removeTask(event);
    }
    if (event.target.classList.contains('edit') || event.target.classList.contains('ei')) {
        editTask(event);
    }
    if (event.target.id === "view-all") {
        displayAllTasks();
    }
    if (event.target.id === "view-remaining") {
        displayRemainingTasks();
    }
    if (event.target.id === "view-completed") {
        displayCompletedTasks();
    }
});

taskInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addTask();
    }
});

timeInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        addTask();
    }
});

function refreshCounts() {
    completedTasks = tasks.filter(task => task.complete);
    remainingTasks = tasks.filter(task => !task.complete);
    document.getElementById("total-count").innerText = tasks.length.toString();
    document.getElementById("completed-count").innerText = completedTasks.length.toString();
}

function addTask() {
    const value = taskInput.value.trim();
    const timeValue = timeInput.value;

    if (value === '') {
        alert("😮 Task cannot be empty");
        return;
    }

    let reminderTime = null;
    if (timeValue) {
        const now = new Date();
        const [hour, minute] = timeValue.split(':');
        const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour), parseInt(minute));

        if (reminderDate < now) {
            reminderDate.setDate(reminderDate.getDate() + 1);
        }

        reminderTime = reminderDate.getTime();
    }

    const newTask = {
        task: value,
        id: currentEditId ? currentEditId : Date.now().toString(),
        complete: false,
        reminderTime: reminderTime,
        reminderSent: false
    };

    if (currentEditId) {
        tasks = tasks.map(task => (task.id === currentEditId ? newTask : task));
        currentEditId = null;
    } else {
        tasks.push(newTask);
    }

    saveTasksToLocalStorage();
    taskInput.value = "";
    timeInput.value = "";
    refreshCounts();
    renderTasks(tasks);
    scheduleReminder(newTask);
}

function renderTasks(taskArray) {
    taskList.innerHTML = "";
    taskArray.forEach(task => {
        const listItem = `
            <li id="${task.id}" class="todo-item ${task.reminderTime ? 'with-reminder' : ''}">
                <div class="task-info">
                    <p id="task">${task.complete ? `<strike>${task.task}</strike>` : task.task}</p>
                    ${task.reminderTime ? `<span class="task-time">🔔 Reminder at: ${formatTime(new Date(task.reminderTime))}</span>` : ''}
                </div>
                <div class="todo-actions">
                    <button class="edit btn btn-warning" title="Edit Task">
                        <i class="ei bx bx-edit bx-sm"></i>
                    </button>
                    <button class="complete btn btn-success">
                        <i class="ci bx bx-check bx-sm"></i>
                    </button>
                    <button class="delete btn btn-error">
                        <i class="di bx bx-trash bx-sm"></i>
                    </button>
                </div>
            </li>`;
        taskList.innerHTML += listItem;
    });
}

function removeTask(event) {
    const taskItem = event.target.closest('.todo-item');
    const taskId = taskItem.getAttribute('id');

    taskItem.classList.add('removed');

    taskItem.addEventListener('animationend', () => {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasksToLocalStorage();
        refreshCounts();
        taskItem.remove();
    });
}

function toggleTaskCompletion(event) {
    const taskId = event.target.closest('.todo-item').getAttribute('id');
    tasks.forEach(task => {
        if (task.id === taskId) {
            task.complete = !task.complete;
            const taskElement = event.target.closest('.todo-item').querySelector("#task");
            if (task.complete) {
                taskElement.innerHTML = `<strike>${task.task}</strike>`;
            } else {
                taskElement.textContent = task.task;
            }
        }
    });
    saveTasksToLocalStorage();
    refreshCounts();
    renderTasks(tasks);
}

function clearAllTasks() {
    if (confirm("Are you sure you want to clear all tasks?")) {
        tasks = [];
        saveTasksToLocalStorage();
        refreshCounts();
        renderTasks(tasks);
    }
}

function clearCompletedTasks() {
    tasks = tasks.filter(task => !task.complete);
    saveTasksToLocalStorage();
    refreshCounts();
    renderTasks(tasks);
}

function displayCompletedTasks() {
    renderTasks(completedTasks);
}

function displayRemainingTasks() {
    renderTasks(remainingTasks);
}

function displayAllTasks() {
    renderTasks(tasks);
}

function saveTasksToLocalStorage() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function formatTime(date) {
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleTimeString([], options);
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log("Notification permission granted.");
                } else {
                    alert("😕 You have denied notification permissions. Reminders will not work.");
                }
            });
        }
    } else {
        alert("🚫 Notifications are not supported by your browser.");
    }
}

function scheduleReminder(task) {
    if (!task.reminderTime) return;

    const now = Date.now();
    const timeDifference = task.reminderTime - now;

    if (timeDifference <= 0) {
        if (!task.reminderSent) {
            sendNotification(task);
            task.reminderSent = true;
            saveTasksToLocalStorage();
        }
        return;
    }

    setTimeout(() => {
        sendNotification(task);
        task.reminderSent = true;
        saveTasksToLocalStorage();
    }, timeDifference);
}


function sendNotification(task) {
    if (Notification.permission === 'granted') {
        const notification = new Notification("Task Reminder", {
            body: `Don't forget to: ${task.task}`,
        });

        notification.onclick = () => {
            window.focus();
        };
    }
}

function initializeReminders() {
    tasks.forEach(task => {
        if (task.reminderTime && !task.reminderSent && !task.complete) {
            scheduleReminder(task);
        }
    });
}

function editTask(event) {
    const taskItem = event.target.closest('.todo-item');
    const taskId = taskItem.getAttribute('id');
    const taskToEdit = tasks.find(task => task.id === taskId);


    taskInput.value = taskToEdit.task;
    timeInput.value = taskToEdit.reminderTime ? formatTime(new Date(taskToEdit.reminderTime)) : '';
    currentEditId = taskId;
}

window.onload = () => {
    requestNotificationPermission();
    renderTasks(tasks);
    refreshCounts();
    initializeReminders();
};
