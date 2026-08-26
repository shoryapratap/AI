const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getMemoryDir() {
    return path.join(app.getPath('userData'), 'memory');
}

function getSchedules() {
    const schedulesPath = path.join(getMemoryDir(), 'schedules.json');
    if (fs.existsSync(schedulesPath)) {
        try {
            return JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
        } catch (e) {
            console.error('Error reading schedules:', e);
        }
    }
    return [];
}

function saveSchedules(schedules) {
    const memoryDir = getMemoryDir();
    if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
    }
    const schedulesPath = path.join(memoryDir, 'schedules.json');
    fs.writeFileSync(schedulesPath, JSON.stringify(schedules, null, 2), 'utf8');
}

let nextReminderTimeout = null;
let reminderCallback = null;

function initReminderEngine(cb) {
    reminderCallback = cb;
    scheduleNextReminder();
}

function parseTimeToDate(dateStr, timeStr) {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    let day = now.getDate();
    
    if (dateStr !== 'everyday') {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
        }
    }
    
    const timeParts = timeStr.split(':');
    let hours = 0;
    let minutes = 0;
    if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
    }
    
    const date = new Date(year, month, day, hours, minutes, 0);
    
    // If it's everyday and the time has already passed today, set to tomorrow
    if (dateStr === 'everyday' && date.getTime() <= now.getTime()) {
        date.setDate(date.getDate() + 1);
    }
    
    return date.getTime();
}

function scheduleNextReminder() {
    if (nextReminderTimeout) {
        clearTimeout(nextReminderTimeout);
        nextReminderTimeout = null;
    }

    const schedules = getSchedules();
    const now = Date.now();
    
    let closestReminder = null;
    let closestTime = Infinity;
    
    for (const schedule of schedules) {
        if (schedule.status !== 'pending') continue;
        
        for (const dateStr of schedule.reminder_dates) {
            for (const timeStr of schedule.reminder_times) {
                const reminderTime = parseTimeToDate(dateStr, timeStr);
                if (reminderTime > now && reminderTime < closestTime) {
                    closestTime = reminderTime;
                    closestReminder = schedule;
                }
            }
        }
    }
    
    if (closestReminder) {
        const timeUntilReminder = closestTime - now;
        console.log(`[Memory Manager] Next reminder scheduled in ${timeUntilReminder}ms for: ${closestReminder.description}`);
        
        const safeTimeout = Math.min(timeUntilReminder, 2147483647); // Max setTimeout ~24.8 days
        
        nextReminderTimeout = setTimeout(() => {
            if (timeUntilReminder > safeTimeout) {
                scheduleNextReminder();
            } else {
                // Trigger the reminder
                if (reminderCallback) {
                    reminderCallback(closestReminder);
                }
                
                // If it's not a recurring 'everyday' schedule, mark it as completed
                if (!closestReminder.reminder_dates.includes('everyday')) {
                    updateScheduleStatus(closestReminder.id, 'completed');
                } else {
                    // Recalculate for tomorrow
                    scheduleNextReminder();
                }
            }
        }, safeTimeout);
    } else {
        console.log('[Memory Manager] No upcoming pending reminders found.');
    }
}

function createSchedule(timeStr, frequencyStr, description) {
    const schedules = getSchedules();
    
    const reminder_times = timeStr.split(',').map(t => t.trim()).filter(t => t);
    const reminder_dates = frequencyStr.split(',').map(d => d.trim().toLowerCase()).filter(d => d);
    
    const descLower = description.toLowerCase();
    const isTask = descLower.includes('bill') || descLower.includes('task') || 
                   descLower.includes('pay') || descLower.includes('deadline') ||
                   descLower.includes('homework') || descLower.includes('project');

    const newSchedule = {
        id: `sch_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        description: description,
        start_date: reminder_dates[0] || "everyday",
        end_date: null,
        start_time: reminder_times[0] || "00:00",
        end_time: reminder_times[reminder_times.length - 1] || "00:00",
        duration: null,
        reminder_dates: reminder_dates,
        reminder_times: reminder_times,
        status: "pending",
        requires_confirmation: isTask
    };

    schedules.push(newSchedule);
    saveSchedules(schedules);
    scheduleNextReminder(); // Recalculate timeout
    return newSchedule;
}

function updateScheduleStatus(id, newStatus) {
    const schedules = getSchedules();
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
        schedule.status = newStatus;
        saveSchedules(schedules);
        scheduleNextReminder(); // Recalculate timeout
        return true;
    }
    return false;
}

async function handleMemoryCommand(task, content) {
    if (task === 'SCHEDULE') {
        const parts = content.split('|');
        if (parts.length >= 3) {
            createSchedule(parts[0], parts[1], parts.slice(2).join('|'));
            console.log(`[Memory Manager] Created schedule: ${parts[2]}`);
            return true;
        } else {
            console.warn(`[Memory Manager] Invalid SCHEDULE command format.`);
            return false;
        }
    }
    // Future memory commands (like UPDATE_MEMORY) can go here
    return false;
}

module.exports = {
    getSchedules,
    saveSchedules,
    createSchedule,
    updateScheduleStatus,
    handleMemoryCommand,
    initReminderEngine
};
