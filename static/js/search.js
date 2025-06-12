const API_BASE = "/api";

const searchElements = {
  searchBox: document.getElementById("searchBox"),
  suggestions: document.getElementById("suggestions"),
  studentDetails: document.getElementById("studentDetails"),
  searchForm: document.getElementById("searchForm"),
  loginBtn: document.getElementById("loginBtn"),
};


let debounceTimer = null;
let currentRequest = null;

document.addEventListener("DOMContentLoaded", initializePage);

searchElements.searchBox.addEventListener("input", handleSearchInput);
searchElements.searchForm.addEventListener("submit", handleFormSubmit);
document.addEventListener("click", handleGlobalClick);

function initializePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const srNo = urlParams.get("sr_no");

  if (srNo) {
    selectStudentBySrNumber(srNo);
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete("sr_no");
    window.history.replaceState({}, "", newUrl);
  }
}

function handleSearchInput() {
  const query = this.value.trim();

  if (query.length === 0) {
    hideSuggestions();
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchAutocomplete(query), 100);
}

async function selectStudentBySrNumber(srNo) {
  try {
    const response = await fetch(`${API_BASE}/students/${srNo}/`);
    if (response.ok) {
      const student = await response.json();
      displayStudentDetails(student);
      searchElements.searchBox.value = student.name;
      hideSuggestions();
    } else {
      console.error("Student not found:", response.status);
      showNoResults();
    }
  } catch (error) {
    console.error("Error fetching student by SR number:", error);
    showNoResults();
  }
}

async function fetchAutocomplete(query) {
  if (currentRequest) {
    currentRequest.abort();
  }

  try {
    const controller = new AbortController();
    currentRequest = controller;

    const response = await fetch(
      `${API_BASE}/autocomplete/?q=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
      }
    );

    if (response.ok) {
      const students = await response.json();
      displaySuggestions(students);
    } else {
      console.error("Autocomplete API error:", response.status);
      hideSuggestions();
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error fetching autocomplete:", error);
      hideSuggestions();
    }
  } finally {
    currentRequest = null;
  }
}

function displaySuggestions(students) {
  if (students.length === 0) {
    hideSuggestions();
    return;
  }
  const fragment = document.createDocumentFragment();

  students.forEach((student) => {
    const div = document.createElement("div");
    div.className = "suggestion";
    div.dataset.studentId = student.id;
    div.innerHTML = `
            <span>${student.name}</span>
            <span class="suggestion-department">${
              student.department || ""
            }</span>
        `;
    fragment.appendChild(div);
  });

  searchElements.suggestions.innerHTML = "";
  searchElements.suggestions.appendChild(fragment);
  searchElements.suggestions.style.display = "block";
}

async function selectStudent(srNo) {
  try {
    const response = await fetch(`${API_BASE}/students/${srNo}/`);
    if (response.ok) {
      const student = await response.json();
      displayStudentDetails(student);
      searchElements.searchBox.value = student.name;
      hideSuggestions();
    } else {
      console.error("Student detail API error:", response.status);
      showNoResults();
    }
  } catch (error) {
    console.error("Error fetching student details:", error);
    showNoResults();
  }
}

const dateCalculations = new Map();
function calculateAge(dob) {
  if (dateCalculations.has(dob)) {
    return dateCalculations.get(dob).age;
  }

  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  const daysUntilNext = getDaysUntilNextBirthday(dob);
  dateCalculations.set(dob, { age, daysUntilNext });
  return age;
}

function getDaysUntilNextBirthday(dob) {
  if (dateCalculations.has(dob)) {
    return dateCalculations.get(dob).daysUntilNext;
  }

  const today = new Date();
  const birthDate = new Date(dob);
  const next = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );
  if (today > next) next.setFullYear(today.getFullYear() + 1);
  const days = Math.ceil((next - today) / (1000 * 60 * 60 * 24));

  return days;
}

function displayStudentDetails(student) {
  const dob = new Date(student.date_of_birth);
  const is1970Date =
    dob.getFullYear() === 1970 && dob.getMonth() === 0 && dob.getDate() === 1;
  const age =
    !is1970Date && student.date_of_birth
      ? calculateAge(student.date_of_birth)
      : null;

  if (student.opt_out) {
    searchElements.studentDetails.innerHTML = createOptOutHTML(student);
    return;
  }

  searchElements.studentDetails.innerHTML = createStudentDetailsHTML(
    student,
    dob,
    is1970Date,
    age
  );
}

function createOptOutHTML(student) {
  return `
        <div class="student-card">
            <div class="privacy-notice">
                <h2 class="student-name">${student.name}</h2>
                <h3>🔒 Privacy Protected</h3>
                <p>This student has chosen to keep their information private.</p>
                <small>Please respect their privacy preference.</small>
                <button class="clear-btn" onclick="clearSearch()">Back to Search</button>
                <div class="opt-out-info">
                    <span class="opt-out-info"> <a href="#" onclick="toggleOptOut('${student.sr_no}')">Request to unhide your data? 🦇</a></span>
                </div>
            </div>
        </div>`;
}

function createStudentDetailsHTML(student, dob, is1970Date, age) {
  let instagramSection;
  if (student.Instagram_id) {
    const isContributor =
      navCurrentUser &&
      student.contributor &&
      navCurrentUser.email === student.contributor;
    instagramSection = `<div class="instagram-info">
            <a href="https://instagram.com/${student.Instagram_id.replace(
              " (Not verified)",
              ""
            )}" target="_blank">@${student.Instagram_id}</a>
            ${
              isContributor
                ? `<button class="popup-submit" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8rem;" onclick="showInstagramContribution('${student.sr_no}')">Edit</button>`
                : ""
            }
        </div>`;
  } else {
    instagramSection = `<span style="color: #666;">Instagram ID not available</span>
           <button class="popup-submit" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8rem;" 
           onclick="showInstagramContribution('${student.sr_no}')">Contribute ID</button>`;
  }

  const localityTags = [student.street, student.street2, student.district]
    .filter(Boolean)
    .map((loc) => `<span class="loc-box">${loc}</span>`)
    .join("");

  const dobSection = is1970Date
    ? "DOB not available"
    : `<p><strong>Date of Birth:</strong> ${dob
        .getDate()
        .toString()
        .padStart(2, "0")}/${(dob.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${dob.getFullYear()} 
            <span class="age-info">${age} years old${
        age < 18 ? " 🚩" : ""
      }</span></p>
            <p><strong>Days until next birthday:</strong> ${getDaysUntilNextBirthday(
              student.date_of_birth
            )} days</p>`;

  return `
        <div class="student-card">
            <h2 class="student-name">${student.name}</h2>
            <div class="social-links">
                <div class="social-id">
                    <span class="social-platform">Instagram</span>
                    ${instagramSection}
                </div>
                <div class="social-id">
                    <span class="social-platform">Phone</span>
                    ${
                      student.father_mobile
                        ? `<a href="tel:${student.father_mobile}">${student.father_mobile}</a>`
                        : "Phone number not available 📱"
                    }
                </div>
                <div class="locality">
                    <span>Locality</span>
                    <div class="locality-tags">${localityTags}</div>
                </div>
                ${
                  student.department
                    ? `<p><strong>Department:</strong> ${student.department}</p>`
                    : ""
                }
                ${dobSection}
            </div>
            <p class="opt-out-info"> 
                <span class="opt-out-info"> <a href="#" onclick="confirmOptOut('${
                  student.sr_no
                }')">Request to hide your data?</a></span>
            </p>
            <button class="clear-btn" onclick="clearSearch()">Clear Results</button>
            <div id="contribute-instagram-form" style="display:none; margin-top:10px;"></div>
        </div>`;
}

function confirmOptOut(srNo) {
  const existingPopup = document.getElementById("optout-confirm-popup");
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement("div");
  popup.id = "optout-confirm-popup";
  Object.assign(popup.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "10000",
  });

  popup.innerHTML = ` <div class="popup-card" style="background: #f9fafb; padding: 2rem 2.5rem; border-radius: 14px; box-shadow: 0 4px 24px #0002; max-width: 370px; text-align: center; font-family: inherit;">
                            <h3 style="color: #222; font-size: 1.4rem; margin-bottom: 0.5em;">Hide Your Profile? </h3>
                            <div style="color: #444; font-size: 1rem; margin-bottom: 1.5em; line-height: 1.6;">
                            Hiding your data means no one can find you—not even your future stalker 👀<br>
                            Are you <em>that</em> shy or just antisocial? 😬<br>
                            <span style="color:#c62828;">(Your crush is gonna think you dropped out 💀)</span>
                            </div>
                            <button id="optout-confirm-btn" style="background: #fff; color: #222; border: 1px solid #bbb; border-radius: 6px; padding: 0.6em 1.2em; margin-right: 1em; font-size: 1rem; cursor: pointer; transition: background 0.2s;">Yehh 🕵️‍♂️</button>
                            <button id="optout-cancel-btn" style="background: #222; color: #fff; border: none; border-radius: 6px; padding: 0.6em 1.2em; font-size: 1rem; cursor: pointer; transition: background 0.2s;">Never Mind 😎</button>
                        </div>`;

  document.body.appendChild(popup);

  document.getElementById("optout-confirm-btn").onclick = () => {
    document.body.removeChild(popup);
    toggleOptOut(srNo);
  };
  document.getElementById("optout-cancel-btn").onclick = () => {
    document.body.removeChild(popup);
  };
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const query = searchElements.searchBox.value.trim();
  if (query.length === 0) return;

  if (/^\d+$/.test(query)) {
    await selectStudentBySrNumber(query);
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/autocomplete/?q=${encodeURIComponent(query)}`
    );
    if (response.ok) {
      const students = await response.json();
      const exactMatch = students.find(
        (s) => s.name.toLowerCase() === query.toLowerCase()
      );
      const targetStudent = exactMatch || students[0];

      if (targetStudent) {
        await selectStudent(targetStudent.id);
      } else {
        showNoResults();
      }
    } else {
      showNoResults();
    }
  } catch (error) {
    console.error("Error in form submission:", error);
    showNoResults();
  }

  hideSuggestions();
}

function showNoResults() {
  searchElements.studentDetails.innerHTML = `
        <div class="student-card">
            <div class="no-results">
                No student found with that name. Try searching for someone else!
            </div>
        </div>`;
}

function handleGlobalClick(e) {
  if (e.target.closest(".suggestion")) {
    const suggestion = e.target.closest(".suggestion");
    const studentId = suggestion.dataset.studentId;
    selectStudent(studentId);
    return;
  }

  if (
    !searchElements.searchBox.contains(e.target) &&
    !searchElements.suggestions.contains(e.target)
  ) {
    hideSuggestions();
  }
}

function clearSearch() {
  searchElements.searchBox.value = "";
  hideSuggestions();
  searchElements.studentDetails.innerHTML = "";

  const newUrl = new URL(window.location);
  newUrl.searchParams.delete("sr_no");
  window.history.replaceState({}, "", newUrl);
}

function hideSuggestions() {
  searchElements.suggestions.style.display = "none";
}

async function toggleOptOut(srNo) {
  const optOutInfo = document.querySelector(".opt-out-info");

  try {
    const response = await fetch(`${API_BASE}/toggle-opt-out/${srNo}/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorMsg =
        response.status === 401 || response.status === 403
          ? "Unauthorized signin with your own account 😬"
          : "Error";
      if (optOutInfo) {
        optOutInfo.textContent = errorMsg;
        optOutInfo.style.color = "red";
      }
      return;
    }

    await response.json();
    await selectStudent(srNo);
    if (optOutInfo) {
      optOutInfo.textContent = "Success";
      optOutInfo.style.color = "green";
    }
  } catch (error) {
    if (optOutInfo) {
      optOutInfo.textContent = "Error";
      optOutInfo.style.color = "red";
    }
  }
}

function getCSRFToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.content || "";
}

function showInstagramContribution(sr_no) {
  const oldPopup = document.getElementById("ig-contribute-popup");
  oldPopup?.remove();

  const popup = document.createElement("div");
  popup.id = "ig-contribute-popup";
  Object.assign(popup.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "9999",
  });

  const isLoggedIn = navCurrentUser?.email;
  popup.innerHTML = `
        <div class="ig-popup-card">
            <h3>Contribute Instagram ID</h3>
            <div class="ig-popup-desc">
                ${
                  isLoggedIn
                    ? `Contributing as <strong>${navCurrentUser.email}</strong>
                    <p style="color:#888; font-size:0.6rem"> Your contribution will be kept anonymous 🛡️</p>`
                    : '<span> <a href="/sign_in?next=/search" style="color:#888; text-decoration:none ">Login to contribute</a></span>'
                }
            </div>
            <input type="text" id="popupInstagramInput" placeholder="Instagram ID without '@' " ${
              isLoggedIn ? "" : "disabled"
            }>
            <div id="popupResponseMsg"></div>
            <button id="popupSubmitBtn" ${
              isLoggedIn ? "" : "disabled"
            }>Submit</button>
            <button id="popupCancelBtn">Cancel</button>
        </div>`;

  document.body.appendChild(popup);
  document.getElementById("popupInstagramInput").focus();

  document.getElementById("popupCancelBtn").onclick = () =>
    document.body.removeChild(popup);
  document.getElementById("popupSubmitBtn").onclick = () =>
    handleInstagramSubmit(sr_no, popup);
}

async function handleInstagramSubmit(sr_no, popup) {
  const instagramID = document
    .getElementById("popupInstagramInput")
    .value.trim();
  const msg = document.getElementById("popupResponseMsg");

  if (!instagramID) {
    msg.textContent = "Please enter an Instagram ID.";
    msg.style.color = "firebrick";
    return;
  }

  const igRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9._]{1,30}$/;
  if (
    !igRegex.test(instagramID) ||
    instagramID.startsWith(".") ||
    instagramID.endsWith(".")
  ) {
    msg.textContent = "Kalikkunoda? Invalid Instagram ID.";
    msg.style.color = "firebrick";
    return;
  }

  try {
    const response = await fetch(`/api/contribute/instagram/${sr_no}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({ instagram_id: instagramID }),
    });

    const data = await response.json();

    if (data.success) {
      msg.style.color = "green";
      msg.textContent = "Instagram ID submitted successfully!";
      setTimeout(() => {
        document.body.removeChild(popup);
        selectStudent(sr_no);
      }, 1000);
    } else {
      msg.style.color = "red";
      msg.textContent = "Error: " + (data.detail || JSON.stringify(data));
    }
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = "Request failed: " + err;
  }
}
