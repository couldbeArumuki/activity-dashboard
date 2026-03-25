const app = {
    // =================== DATA STRUCTURES ===================
    tasks: [],
    habits: {},
    studySessions: [],
    jlptData: {
        totalVocab: 0,
        totalGrammar: 0,
        target: '',
        vocabGoal: 1000,
        notes: [],
        dailyLogs: {}
    },
    timerInterval: null,
    timerSeconds: 1500,
    isRunning: false,
    currentMode: 'focus',

    // =================== INITIALIZATION ===================
    init() {
        this.loadFromStorage();
        this.renderAll();
    },

    // =================== STORAGE ===================
    loadFromStorage() {
        const tasksData = localStorage.getItem('tasks');
        const habitsData = localStorage.getItem('habits');
        const sessionsData = localStorage.getItem('studySessions');
        const jlptData = localStorage.getItem('jlptData');

        this.tasks = tasksData ? JSON.parse(tasksData) : [];
        this.habits = habitsData ? JSON.parse(habitsData) : {};
        this.studySessions = sessionsData ? JSON.parse(sessionsData) : [];
        this.jlptData = jlptData ? JSON.parse(jlptData) : this.jlptData;
    },

    saveToStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        localStorage.setItem('habits', JSON.stringify(this.habits));
        localStorage.setItem('studySessions', JSON.stringify(this.studySessions));
        localStorage.setItem('jlptData', JSON.stringify(this.jlptData));
    },

    // =================== TASKS ===================
    addTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const time = document.getElementById('taskTime').value;
        const priority = document.getElementById('taskPriority').value;

        if (!title) {
            this.showToast('Please enter a task title!');
            return;
        }

        const task = {
            id: Date.now(),
            title,
            time: time || '',
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveToStorage();
        this.renderTasks();
        this.showToast('Task added! ✨');

        document.getElementById('taskTitle').value = '';
        document.getElementById('taskTime').value = '';
        document.getElementById('taskPriority').value = 'medium';
    },

    completeTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = true;
            this.saveToStorage();
            this.renderTasks();
            this.showToast('Task completed! 🎉');
        }
    },

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveToStorage();
        this.renderTasks();
    },

    renderTasks() {
        const list = document.getElementById('taskList');
        if (this.tasks.length === 0) {
            list.innerHTML = '<div class="empty-state">No tasks yet. Add one to get started! 💪</div>';
            return;
        }

        list.innerHTML = this.tasks.map(task => `
            <li class="task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="app.completeTask(${task.id})">
                <div class="task-content">
                    <div class="task-text">${this.escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        ${task.time ? `<span class="task-time">⏰ ${task.time}</span>` : ''}
                        <span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span>
                    </div>
                </div>
                <div class="task-buttons">
                    <button class="btn btn-danger btn-small" onclick="app.deleteTask(${task.id})">Delete</button>
                </div>
            </li>
        `).join('');
    },

    // =================== HABITS ===================
    addHabit() {
        const name = document.getElementById('habitName').value.trim();
        if (!name) {
            this.showToast('Please enter a habit name!');
            return;
        }

        if (!this.habits[name]) {
            this.habits[name] = {
                createdAt: new Date().toISOString(),
                streak: 0,
                lastChecked: null,
                checkDates: {}
            };
            this.saveToStorage();
            this.renderHabits();
            this.showToast('Habit added! 🎯');
            document.getElementById('habitName').value = '';
        } else {
            this.showToast('Habit already exists!');
        }
    },

    checkHabit(habitName) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.habits[habitName].checkDates) {
            this.habits[habitName].checkDates = {};
        }

        if (this.habits[habitName].checkDates[today]) {
            delete this.habits[habitName].checkDates[today];
        } else {
            this.habits[habitName].checkDates[today] = true;
        }

        this.updateHabitStreak(habitName);
        this.saveToStorage();
        this.renderHabits();
    },

    deleteHabit(habitName) {
        delete this.habits[habitName];
        this.saveToStorage();
        this.renderHabits();
    },

    updateHabitStreak(habitName) {
        const dates = Object.keys(this.habits[habitName].checkDates).sort().reverse();
        let streak = 0;
        const today = new Date();

        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);

            if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
                streak++;
            } else {
                break;
            }
        }

        this.habits[habitName].streak = streak;
    },

    getWeeklyStreak(habitName) {
        const today = new Date();
        let count = 0;

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            if (this.habits[habitName].checkDates && this.habits[habitName].checkDates[dateStr]) {
                count++;
            }
        }

        return count;
    },

    renderHabits() {
        const list = document.getElementById('habitList');
        const habitNames = Object.keys(this.habits);

        if (habitNames.length === 0) {
            list.innerHTML = '<div class="empty-state">No habits yet. Create one to start tracking! 🌟</div>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        list.innerHTML = habitNames.map(name => {
            const habit = this.habits[name];
            const isCheckedToday = habit.checkDates && habit.checkDates[today];
            const weeklyCount = this.getWeeklyStreak(name);

            return `
                <li class="habit-item">
                    <div class="habit-info">
                        <div class="habit-name">${this.escapeHtml(name)}</div>
                        <div class="habit-streak">
                            This week: ${weeklyCount}/7 days ${isCheckedToday ? '🔥' : ''}
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="btn btn-check btn-small ${isCheckedToday ? 'checked' : ''}" 
                            onclick="app.checkHabit('${name.replace(/'/g, "\\'")}')"
                            title="Mark as done today">
                            ${isCheckedToday ? '✓ Done' : 'Mark Done'}
                        </button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteHabit('${name.replace(/'/g, "\\'")}')" title="Delete habit">Delete</button>
                    </div>
                </li>
            `;
        }).join('');
    },

    // =================== TIMER ===================
    startFocusTimer() {
        if (this.isRunning) return;
        this.currentMode = 'focus';
        this.timerSeconds = 1500;
        this.startTimer();
        document.getElementById('timerLabel').textContent = 'Focus Time';
    },

    startBreakTimer() {
        if (this.isRunning) return;
        this.currentMode = 'break';
        this.timerSeconds = 300;
        this.startTimer();
        document.getElementById('timerLabel').textContent = 'Break Time';
    },

    startTimer() {
        if (this.isRunning) return;
        this.isRunning = true;

        this.timerInterval = setInterval(() => {
            this.timerSeconds--;
            this.updateTimerDisplay();

            if (this.timerSeconds <= 0) {
                this.timerComplete();
            }
        }, 1000);
    },

    pauseTimer() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
    },

    resetTimer() {
        this.pauseTimer();
        this.timerSeconds = 1500;
        this.currentMode = 'focus';
        this.updateTimerDisplay();
        document.getElementById('timerLabel').textContent = 'Focus Time';
    },

    timerComplete() {
        this.pauseTimer();

        if (this.currentMode === 'focus') {
            this.studySessions.push({
                date: new Date().toISOString(),
                duration: 25
            });
            this.updateJLPTStats();
            this.saveToStorage();
            this.renderTimer();
            this.showToast('Focus session complete! 🎉 Time for a break!');
            this.startBreakTimer();
        } else {
            this.showToast('Break time over! Ready for another session? 💪');
            this.resetTimer();
        }
    },

    updateTimerDisplay() {
        const minutes = Math.floor(this.timerSeconds / 60);
        const seconds = this.timerSeconds % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
    },

    renderTimer() {
        const today = new Date().toISOString().split('T')[0];
        const todaysSessions = this.studySessions.filter(s => s.date.startsWith(today));
        const totalMinutes = todaysSessions.reduce((sum, s) => sum + s.duration, 0);

        document.getElementById('sessionsCount').textContent = todaysSessions.length;
        document.getElementById('totalStudyTime').textContent =
            totalMinutes > 60
                ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
                : `${totalMinutes}m`;
    },

    // =================== JAPANESE LEARNING ===================
    addJLPTNote() {
        const note = document.getElementById('dailyNote').value.trim();
        const vocab = parseInt(document.getElementById('vocabInput').value) || 0;
        const grammar = parseInt(document.getElementById('grammarInput').value) || 0;
        const level = document.getElementById('jlptLevel').value;
        const goal = parseInt(document.getElementById('vocabGoal').value) || 1000;

        if (!note && vocab === 0 && grammar === 0) {
            this.showToast('Add some data before saving!');
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        if (!this.jlptData.dailyLogs[today]) {
            this.jlptData.dailyLogs[today] = {
                vocab: 0,
                grammar: 0,
                level: '',
                notes: []
            };
        }

        this.jlptData.dailyLogs[today].vocab += vocab;
        this.jlptData.dailyLogs[today].grammar += grammar;
        if (level) this.jlptData.dailyLogs[today].level = level;

        this.jlptData.notes.push({
            date: new Date().toISOString(),
            text: note || `+${vocab} vocab, +${grammar} grammar`,
            vocab,
            grammar
        });

        this.jlptData.totalVocab += vocab;
        this.jlptData.totalGrammar += grammar;
        this.jlptData.vocabGoal = goal;
        if (level) this.jlptData.target = level;

        this.saveToStorage();
        this.updateJLPTStats();
        this.renderJLPTNotes();
        this.showToast('Progress logged! 🗾');

        document.getElementById('vocabInput').value = '0';
        document.getElementById('grammarInput').value = '0';
        document.getElementById('dailyNote').value = '';
    },

    updateJLPTStats() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const weeklyVocab = this.jlptData.notes
            .filter(n => n.date > oneWeekAgo)
            .reduce((sum, n) => sum + (n.vocab || 0), 0);

        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            if (this.jlptData.dailyLogs[dateStr]) {
                streak++;
            } else {
                break;
            }
        }

        document.getElementById('weeklyVocab').textContent = weeklyVocab;
        document.getElementById('studyStreak').textContent = `${streak} 🔥`;
        document.getElementById('currentJLPT').textContent = this.jlptData.target || '—';

        const progress = Math.min(100, (this.jlptData.totalVocab / this.jlptData.vocabGoal) * 100);
        document.getElementById('vocabProgress').style.width = `${progress}%`;
        document.getElementById('vocabProgressText').textContent =
            `${this.jlptData.totalVocab} / ${this.jlptData.vocabGoal} words`;
    },

    renderJLPTNotes() {
        const container = document.getElementById('jlptNotes');
        if (this.jlptData.notes.length === 0) {
            container.innerHTML = '<div class="empty-state">No notes yet. Start logging your progress! 📝</div>';
            return;
        }

        const recentNotes = this.jlptData.notes.slice(-5).reverse();
        container.innerHTML = recentNotes.map(note => {
            const date = new Date(note.date);
            const timeStr = date.toLocaleString('id-ID', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="note-item">
                    <div class="note-text">${this.escapeHtml(note.text)}</div>
                    <div class="note-meta">
                        ${timeStr} • +${note.vocab || 0} vocab, +${note.grammar || 0} grammar
                    </div>
                </div>
            `;
        }).join('');
    },

    // =================== RENDER ALL ===================
    renderAll() {
        this.renderTasks();
        this.renderHabits();
        this.renderTimer();
        this.updateJLPTStats();
        this.renderJLPTNotes();
    },

    // =================== UTILITIES ===================
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});