async function fetchBirthdays() {
    try {
        const response = await fetch('/api/upcoming-birthday');
        if (!response.ok) {
            throw new Error('Failed to fetch birthdays');
        }
        const data = await response.json();
        displayBirthdays(data.students);
    } catch (error) {
        console.error('Error fetching birthdays:', error);
        document.getElementById('allBirthdays').innerHTML = 
            '<div class="empty-state" style="color: var(--muted); padding: 2rem; text-align: center;">Failed to load birthdays</div>';
    }
}

function displayBirthdays(students) {
    const todayBirthdays = students.filter(student => student.days_until === 0);
    const upcomingBirthdays = students.filter(student => student.days_until > 0);
    const allBirthdays = [...todayBirthdays, ...upcomingBirthdays];

    const container = document.getElementById('allBirthdays');
    container.innerHTML = '';

    if (allBirthdays.length === 0) {
        container.appendChild(createEmptyStateElement());
        return;
    }

    allBirthdays.forEach(student => {
        container.appendChild(createBirthdayElement(student));
    });
}

function createBirthdayElement(student) {
    const birthdayItem = createElement('div', {
        className: `birthday-item ${student.days_until === 0 ? 'today' : ''}`,
        style: `
            cursor: pointer;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s ease;
            ${student.days_until === 0 ? `
                border-color: #ff6b6b;
                background: linear-gradient(135deg, var(--bg) 0%, var(--hover-bg) 100%);
                box-shadow: var(--card-shadow);
            ` : ''}
        `
    });

    birthdayItem.appendChild(createDateElement(student.birthday_date, student.days_until === 0));
    birthdayItem.appendChild(createStudentElement(student));
    birthdayItem.appendChild(createDaysUntilElement(student.days_until));

    // Add hover effect
    birthdayItem.addEventListener('mouseenter', () => {
        birthdayItem.style.transform = 'translateY(-2px)';
        birthdayItem.style.boxShadow = 'var(--card-shadow)';
        birthdayItem.style.borderColor = 'var(--text)';
    });

    birthdayItem.addEventListener('mouseleave', () => {
        birthdayItem.style.transform = 'translateY(0)';
        birthdayItem.style.boxShadow = student.days_until === 0 ? 'var(--card-shadow)' : 'none';
        birthdayItem.style.borderColor = student.days_until === 0 ? '#ff6b6b' : 'var(--border)';
    });

    birthdayItem.addEventListener('click', () => {
        window.location.href = `/search/?sr_no=${student.sr_no}`;
    });

    return birthdayItem;
}

function createDateElement(birthdayDate, isToday) {
    const [day, month] = birthdayDate.split('/');
    
    const dateInfo = createElement('div', { 
        className: 'date-info',
        style: `
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 60px;
            padding: 0.5rem;
            border-radius: 8px;
            ${isToday ? `
                background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
                color: white;
            ` : `
                background: var(--hover-bg);
                color: var(--text);
            `}
        `
    });

    dateInfo.appendChild(createElement('div', { 
        className: 'date-day', 
        textContent: day,
        style: `
            font-size: 1.2rem;
            font-weight: 600;
            line-height: 1;
        `
    }));

    dateInfo.appendChild(createElement('div', { 
        className: 'date-month', 
        textContent: getMonthName(month),
        style: `
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
            opacity: 0.8;
        `
    }));

    return dateInfo;
}

function createStudentElement(student) {
    const isToday = student.days_until === 0;
    const studentInfo = createElement('div', { 
        className: 'birthday-info',
        style: `
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        `
    });
    
    const studentName = createElement('div', { 
        className: 'birthday-name',
        style: `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text);
        `
    });
    
    if (isToday) {
        studentName.appendChild(createElement('span', { 
            className: 'cake-icon', 
            textContent: '🎂',
            style: 'font-size: 1.2rem;'
        }));
    }
    
    studentName.appendChild(document.createTextNode(student.name));
    
    if (isToday) {
        studentName.appendChild(createElement('span', { 
            className: 'birthday-badge',
            textContent: 'BIRTHDAY',
            style: `
                background: #ff6b6b;
                color: white;
                padding: 0.2rem 0.5rem;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: 600;
                letter-spacing: 0.5px;
            `
        }));
    }

    const studentDetail = createElement('div', { 
        className: 'student-detail',
        textContent: `${student.department} • Turning ${student.turning_age}`,
        style: `
            color: var(--muted);
            font-size: 0.9rem;
        `
    });

    studentInfo.appendChild(studentName);
    studentInfo.appendChild(studentDetail);

    return studentInfo;
}

function createDaysUntilElement(daysUntil) {
    const daysUntilDiv = createElement('div', { 
        className: 'days-until',
        style: `
            text-align: center;
            min-width: 70px;
        `
    });
    
    if (daysUntil === 0) {
        daysUntilDiv.appendChild(createElement('span', {
            className: 'today-celebration',
            textContent: 'TODAY!',
            style: `
                color: #ff6b6b;
                font-weight: 700;
                font-size: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `
        }));
    } else {
        daysUntilDiv.appendChild(createElement('span', {
            className: 'days-remaining',
            textContent: `${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
            style: `
                color: var(--text);
                font-weight: 600;
                font-size: 0.9rem;
                display: block;
            `
        }));
        
        daysUntilDiv.appendChild(createElement('span', {
            className: 'days-label',
            textContent: 'to go',
            style: `
                color: var(--muted);
                font-size: 0.75rem;
                display: block;
                margin-top: 0.1rem;
            `
        }));
    }

    return daysUntilDiv;
}

function createEmptyStateElement() {
    return createElement('div', { 
        className: 'empty-state',
        textContent: 'No birthdays found',
        style: `
            color: var(--muted);
            padding: 3rem 2rem;
            text-align: center;
            background: var(--hover-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            font-size: 1.1rem;
        `
    });
}

function createElement(tag, properties = {}) {
    const element = document.createElement(tag);
    
    Object.entries(properties).forEach(([key, value]) => {
        if (key === 'textContent') {
            element.textContent = value;
        } else {
            element[key] = value;
        }
    });

    return element;
}

function getMonthName(monthNumber) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(monthNumber) - 1];
}

// Load birthdays when page loads
document.addEventListener('DOMContentLoaded', fetchBirthdays);

