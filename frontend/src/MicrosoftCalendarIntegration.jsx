
import React, { useState } from 'react';

const generateCalendarEvents = (medicine, startDate) => {
    const events = [];
    const times = {
        morning: { hour: 9, minute: 0 },
        afternoon: { hour: 14, minute: 0 },
        evening: { hour: 21, minute: 0 }
    };

    // Use dosage_pattern if available, otherwise fallback to "0+0+0"
    const pattern = medicine.dosage_pattern || "0+0+0";
    const dosages = pattern.split('+').map(Number);
    const days = medicine.duration_days || 1;

    for (let day = 0; day < days; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);

        // Morning dose (9 AM)
        if (dosages[0] === 1) {
            const eventStart = new Date(currentDate);
            eventStart.setHours(times.morning.hour, times.morning.minute, 0, 0);
            events.push(createEventObject(medicine.medicine_name, eventStart, '9:00 AM', medicine.instructions));
        }

        // Afternoon dose (2 PM)
        if (dosages[1] === 1) {
            const eventStart = new Date(currentDate);
            eventStart.setHours(times.afternoon.hour, times.afternoon.minute, 0, 0);
            events.push(createEventObject(medicine.medicine_name, eventStart, '2:00 PM', medicine.instructions));
        }

        // Evening dose (9 PM)
        if (dosages[2] === 1) {
            const eventStart = new Date(currentDate);
            eventStart.setHours(times.evening.hour, times.evening.minute, 0, 0);
            events.push(createEventObject(medicine.medicine_name, eventStart, '9:00 PM', medicine.instructions));
        }
    }

    return events;
};

const createEventObject = (medicineName, startDateTime, timeLabel, instructions) => {
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 15); // 15 min event

    return {
        subject: `💊 Take ${medicineName}`,
        body: {
            contentType: 'HTML',
            content: `<p>Time to take your medicine: <strong>${medicineName}</strong></p>
                      <p>Scheduled time: ${timeLabel}</p>
                      ${instructions ? `<p><em>Instructions: ${instructions}</em></p>` : ''}
                      <p><em>This is an automated reminder from your prescription calendar.</em></p>`
        },
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminderMinutesBeforeStart: 15,
        isReminderOn: true
    };
};

const buildOutlookComposeUrl = (event) => {
    const base = 'https://outlook.office.com/calendar/deeplink/compose';
    const params = new URLSearchParams();
    params.set('path', '/calendar/action/compose');
    params.set('rru', 'addevent');
    params.set('startdt', event.start.dateTime);
    params.set('enddt', event.end.dateTime);
    params.set('subject', event.subject);
    params.set('body', stripHtml(event.body?.content || ''));
    params.set('location', 'Medicine Reminder');
    return `${base}?${params.toString()}`;
};

const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
};

export default function MicrosoftCalendarIntegration({ medicines }) {
    const [isAdding, setIsAdding] = useState(false);

    const handleAddToCalendar = () => {
        if (!medicines || medicines.length === 0) return;
        setIsAdding(true);
        try {
            const startDate = new Date();
            const allEvents = [];
            for (const medicine of medicines) {
                const events = generateCalendarEvents(medicine, startDate);
                allEvents.push(...events);
            }
            const now = new Date();
            const upcoming = allEvents
                .map(e => ({ e, t: new Date(e.start.dateTime).getTime() }))
                .filter(x => x.t >= now.getTime())
                .sort((a, b) => a.t - b.t);
            const nextEvent = (upcoming[0] ? upcoming[0].e : allEvents[0]);
            if (nextEvent) {
                const url = buildOutlookComposeUrl(nextEvent);
                window.open(url, '_blank');
            }
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="mt-4 p-4 bg-gradient-to-r from-[#1e3a5f]/5 to-[#0f2744]/5 border border-[#1e3a5f]/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h4 className="text-slate-800 font-semibold flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#1e3a5f]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V9h15v10.5zm0-12h-15v-3h3V6H9V4.5h6V6h1.5V4.5h3v3z" />
                        </svg>
                        Add to Outlook Calendar
                    </h4>
                </div>

                <button
                    onClick={handleAddToCalendar}
                    disabled={isAdding}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#0f2744] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add to Outlook Calendar</span>
                    </>
                </button>
            </div>
        </div>
    );
}
