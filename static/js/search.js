const API_BASE = '/api';
const searchBox = document.getElementById('searchBox');
const suggestions = document.getElementById('suggestions');
const studentDetails = document.getElementById('studentDetails');
const searchForm = document.getElementById('searchForm');

let currentUser = null;
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', checkAuthStatus);

searchBox.addEventListener('input', function () {
    const query = this.value.trim();
    if (query.length === 0) {
    suggestions.style.display = 'none';
    return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
    fetchAutocomplete(query);
    }, 300);
});

async function fetchAutocomplete(query) {
    try {
    const response = await fetch(`${API_BASE}/autocomplete/?q=${encodeURIComponent(query)}`);
    if (response.ok) {
        const students = await response.json();
        displaySuggestions(students);
    } else {
        console.error('Autocomplete API error:', response.status);
        suggestions.style.display = 'none';
    }
    } catch (error) {
    console.error('Error fetching autocomplete:', error);
    suggestions.style.display = 'none';
    }
}

function displaySuggestions(students) {
    if (students.length === 0) {
    suggestions.style.display = 'none';
    return;
    }

    suggestions.innerHTML = students.map(student => `
    <div class="suggestion" onclick="selectStudent('${student.id}')">
        <span>${student.name}</span>
        <span class="suggestion-department">${student.department || ''}</span>
    </div>
    `).join('');

    suggestions.style.display = 'block';
}

async function selectStudent(srNo) {
    try {
    const response = await fetch(`${API_BASE}/students/${srNo}/`);
    if (response.ok) {
        const student = await response.json();
        displayStudentDetails(student);
        searchBox.value = student.name;
        suggestions.style.display = 'none';
    } else {
        console.error('Student detail API error:', response.status);
        showNoResults();
    }
    } catch (error) {
    console.error('Error fetching student details:', error);
    showNoResults();
    }
}

function calculateAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

function getDaysUntilNextBirthday(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (today > next) next.setFullYear(today.getFullYear() + 1);
    return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
}

// Replace the existing displayStudentDetails function with this enhanced version
function displayStudentDetails(student) {
    const dob = new Date(student.date_of_birth);
    const is1970Date = dob.getFullYear() === 1970 && dob.getMonth() === 0 && dob.getDate() === 1;
    const age = (!is1970Date && student.date_of_birth) ? calculateAge(student.date_of_birth) : null;

    if (student.opt_out) {
    studentDetails.innerHTML = `
        <div class="student-card">
        <div class="privacy-notice">
            <h2 class="student-name">${student.name}</h2>
            <h3>🔒 Privacy Protected</h3>
            <p>This student has chosen to keep their information private.</p>
            <small>Please respect their privacy preference.</small>
            <button class="clear-btn" onclick="clearSearch()">Back to Search</button>
        </div>
        </div>`;
    return;
    }

    studentDetails.innerHTML = `
    <div class="student-card">
        <h2 class="student-name">${student.name}</h2>
        <div class="social-links">
            <div class="social-id">
                <span class="social-platform">Instagram</span>
                ${student.Instagram_id
                    ? `<div class="instagram-info">
                        <a href="https://instagram.com/${student.Instagram_id}" target="_blank">@${student.Instagram_id}</a>
                       </div>`
                    : `Instagram ID not yet available 😢
                        <button class="contribute-btn" onclick="showInstagramContribution('${student.sr_no}')">Contribute Instagram ID</button>`
                }
            </div>
            <div class="social-id">
                <span class="social-platform">Phone</span>
                ${student.father_mobile
                    ? `<a href="tel:${student.father_mobile}">${student.father_mobile}</a>`
                    : 'Phone number not available 📱'}
            </div>
            ${student.department ? `<p><strong>Department:</strong> ${student.department}</p>` : ''}
            ${is1970Date
                ? 'DOB not available'
                : `<p><strong>Date of Birth:</strong> ${dob.toLocaleDateString()} 
                    <span class="age-info">${age} years old${age < 18 ? ' 🚩' : ''}</span></p>
                    <p><strong>Days until next birthday:</strong> ${getDaysUntilNextBirthday(student.date_of_birth)} days</p>`}
        </div>
        ${generateOptOutLink(student)}
        <button class="clear-btn" onclick="clearSearch()">Clear Results</button>
        <div id="contribute-instagram-form" style="display:none; margin-top:10px;"></div>
    </div>`;
}

function generateOptOutLink(student) {
    if (currentUser && currentUser.sr_no === student.sr_no) {
    return `
        <div class="opt-out">
        <button onclick="toggleOptOut('${student.sr_no}')" class="opt-out-btn">
            ${student.opt_out ? '🔓 Opt back in' : '🔒 Request to remove your data'}
        </button>
        </div>`;
    }
    return '';
}

searchForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const query = searchBox.value.trim();
    if (query.length === 0) return;

    try {
    const response = await fetch(`${API_BASE}/autocomplete/?q=${encodeURIComponent(query)}`);
    if (response.ok) {
        const students = await response.json();
        const exactMatch = students.find(s => s.name.toLowerCase() === query.toLowerCase());
        if (exactMatch) {
        await selectStudent(exactMatch.id);
        } else if (students.length > 0) {
        await selectStudent(students[0].id);
        } else {
        showNoResults();
        }
    } else {
        showNoResults();
    }
    } catch (error) {
    console.error('Error in form submission:', error);
    showNoResults();
    }

    suggestions.style.display = 'none';
});

function showNoResults() {
    studentDetails.innerHTML = `
    <div class="student-card">
        <div class="no-results">
        No student found with that name. Try searching for someone else!
        </div>
    </div>
    `;
}

document.addEventListener('click', function (e) {
    if (!searchBox.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.style.display = 'none';
    }
});

function clearSearch() {
    searchBox.value = '';
    suggestions.style.display = 'none';
    studentDetails.innerHTML = '';
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/auth-status');
        if (response.ok) {
            const userData = await response.json();
            if (userData.isAuthenticated) {
                currentUser = {
                    name: userData.name,
                    profile_pic: userData.picture,
                    email: userData.email
                };
                updateAuthUI(currentUser);
            } else {
                currentUser = null;
                updateAuthUI(null);
            }
        } else {
            console.error('Error fetching auth status:', response.status);
            currentUser = null;
            updateAuthUI(null);
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        currentUser = null;
        updateAuthUI(null);
    }
}

// Replace the existing updateAuthUI function with this improved version
function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');

    if (user) {
        loginBtn.textContent = user.name || 'Profile';
        loginBtn.href = '/sign-out';
    } else {
        loginBtn.textContent = 'Login with Google';
        loginBtn.href = '/sign_in';
    }
}

async function toggleOptOut(srNo) {
    if (!currentUser) {
    alert('Please login to perform this action');
    return;
    }

    try {
    const response = await fetch(`${API_BASE}/toggle-opt-out/${srNo}/`, {
        method: 'POST',
        credentials: 'include'
    });

    if (response.ok) {
        const data = await response.json();
        await selectStudent(srNo);
        alert(data.message || 'Status updated successfully');
    } else {
        alert('Error updating status');
    }
    } catch (error) {
    console.error('Error toggling opt-out:', error);
    alert('Error updating status');
    }
}

function showInstagramContribution(srNo) {
    const popup = document.createElement('div');
    popup.className = 'popup-overlay';
    popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-header">
                <h3>Contribute Instagram ID</h3>
            </div>
            <input type="text" 
                   class="popup-input" 
                   id="instagramInput" 
                   placeholder="Enter Instagram username (without @)"
                   pattern="^[A-Za-z0-9._]{1,30}$">
            <div class="popup-buttons">
                <button class="popup-cancel" onclick="closePopup()">Cancel</button>
                <button class="popup-submit" onclick="submitInstagramId('${srNo}')">Submit</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function closePopup() {
    const popup = document.querySelector('.popup-overlay');
    if (popup) {
        popup.remove();
    }
}
