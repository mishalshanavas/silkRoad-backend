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
            '<div class="empty-state">Failed to load birthdays</div>';
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
        className: `birthday-item ${student.days_until === 0 ? 'today' : ''}`
    });

    birthdayItem.appendChild(createDateElement(student.birthday_date, student.days_until === 0));
    birthdayItem.appendChild(createStudentElement(student));
    birthdayItem.appendChild(createDaysUntilElement(student.days_until));

    birthdayItem.addEventListener('click', () => {
        selectStudentBySrNumber(student.sr_no);
    });

    return birthdayItem;
}

function createDateElement(birthdayDate, isToday) {
    const [day, month] = birthdayDate.split('/');
    
    const dateInfo = createElement('div', { 
        className: 'date-info'
    });

    dateInfo.appendChild(createElement('div', { 
        className: 'date-day', 
        textContent: day
    }));

    dateInfo.appendChild(createElement('div', { 
        className: 'date-month', 
        textContent: getMonthName(month)
    }));

    return dateInfo;
}

function createDaysUntilElement(daysUntil) {
    const daysUntilDiv = createElement('div', { 
        className: 'days-until'
    });
    
    if (daysUntil === 0) {
        daysUntilDiv.appendChild(createElement('span', {
            className: 'birthday-badge',
            textContent: 'BIRTHDAY'
        }));
    } else {
        daysUntilDiv.appendChild(createElement('span', {
            className: 'days-remaining',
            textContent: `${daysUntil} day${daysUntil > 1 ? 's' : ''}`
        }));
        
        daysUntilDiv.appendChild(createElement('span', {
            className: 'days-label',
            textContent: 'to go'
        }));
    }

    return daysUntilDiv;
}

function createStudentElement(student) {
    const isToday = student.days_until === 0;
    const studentInfo = createElement('div', { 
        className: 'birthday-info'
    });
    
    const studentName = createElement('div', { 
        className: 'birthday-name'
    });
    
    if (isToday) {
        studentName.appendChild(createElement('span', { 
            className: 'cake-icon', 
            textContent: '🎂'
        }));
    }
    
    studentName.appendChild(document.createTextNode(student.name));

    const studentDetail = createElement('div', { 
        className: 'student-detail',
        textContent: `${student.department} • Turning ${student.turning_age}`
    });

    studentInfo.appendChild(studentName);
    studentInfo.appendChild(studentDetail);

    return studentInfo;
}

function createEmptyStateElement() {
    return createElement('div', { 
        className: 'empty-state',
        textContent: 'No birthdays found'
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

