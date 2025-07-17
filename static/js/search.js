const API_BASE = "/api";
const searchElements = {
  searchBox: document.getElementById("searchBox"),
  suggestions: document.getElementById("suggestions"),
  studentDetails: document.getElementById("studentDetails"),
  searchForm: document.getElementById("searchForm"),
  loginBtn: document.getElementById("loginBtn"),
};

let autocompleteCache = null;
let autocompleteCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000;

let debounceTimer = null;
let currentRequest = null;
document.addEventListener("DOMContentLoaded", initializePage);
searchElements.searchBox.addEventListener("input", handleSearchInput);
searchElements.searchForm.addEventListener("submit", handleFormSubmit);
document.addEventListener("click", handleGlobalClick);

async function initializePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const srNo = urlParams.get("sr_no");
  await loadAutocompleteCache();
  if (srNo) {
    selectStudentBySrNumber(srNo);
    cleanURL();
  }
}

function cleanURL() {
  const newUrl = new URL(window.location);
  newUrl.searchParams.delete("sr_no");
  window.history.replaceState({}, "", newUrl);
}

class SearchIndex {
  constructor() {
    this.nameIndex = new Map();
    this.departmentIndex = new Map();
    this.prefixMap = new Map();
  }

  buildIndex(students) {
    students.forEach(student => {
      const name = student.name.toLowerCase();
      const dept = student.department?.toLowerCase() || '';
      for (let i = 1; i <= name.length; i++) {
        const prefix = name.substring(0, i);
        if (!this.prefixMap.has(prefix)) {
          this.prefixMap.set(prefix, []);
        }
        this.prefixMap.get(prefix).push(student);
      }
      this.nameIndex.set(name, student);
      if (dept) {
        if (!this.departmentIndex.has(dept)) {
          this.departmentIndex.set(dept, []);
        }
        this.departmentIndex.get(dept).push(student);
      }
    });
  }

  search(query, limit = 10) {
    const searchTerm = query.toLowerCase();
    const results = new Set();
    if (this.nameIndex.has(searchTerm)) {
      results.add(this.nameIndex.get(searchTerm));
    }
    const prefixMatches = this.prefixMap.get(searchTerm) || [];
    prefixMatches.forEach(student => results.add(student));
    if (results.size < limit) {
      for (const [name, student] of this.nameIndex) {
        if (name.includes(searchTerm) && results.size < limit) {
          results.add(student);
        }
      }
    }
    return Array.from(results).slice(0, limit);
  }
}

let searchIndex = new SearchIndex();

async function loadAutocompleteCache() {
  if (autocompleteCache && autocompleteCacheTimestamp && (Date.now() - autocompleteCacheTimestamp) < CACHE_DURATION) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/allstudents/`);
    if (response.ok) {
      autocompleteCache = await response.json();
      autocompleteCacheTimestamp = Date.now();
      searchIndex.buildIndex(autocompleteCache);
    }
  } catch (error) {
    console.error("Error loading autocomplete cache:", error);
  }
}

function searchFromCache(query) {
  if (!autocompleteCache) {
    fetchAutocomplete(query);
    return;
  }
  const searchTerm = query.toLowerCase();
  const scoredResults = autocompleteCache.map(student => {
    const nameScore = fuzzyScore(searchTerm, student.name);
    return { student, score: nameScore };
  })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(result => result.student);
  displaySuggestions(scoredResults);
}

function handleSearchInput() {
  const query = this.value.trim();
  if (query.length === 0) {
    hideSuggestions();
    searchElements.searchBox.parentElement.classList.remove('search-loading');
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchElements.searchBox.parentElement.classList.add('search-loading');
    showLoadingSuggestions();
    searchFromCache(query);
  }, 300);
}

function fuzzyScore(searchTerm, target) {
  const search = searchTerm.toLowerCase();
  const text = target.toLowerCase();
  if (text.includes(search)) {
    return 100 - text.indexOf(search);
  }
  let score = 0;
  let searchIndex = 0;
  let prevMatchIndex = -1;
  for (let i = 0; i < text.length && searchIndex < search.length; i++) {
    if (text[i] === search[searchIndex]) {
      score += 2;
      if (prevMatchIndex === i - 1) {
        score += 2;
      }
      prevMatchIndex = i;
      searchIndex++;
    }
  }
  if (searchIndex === search.length) {
    score += 10; 
  }
  score -= Math.abs(text.length - search.length) * 0.5;
  return Math.max(0, Math.round(score));
}

function showLoadingSuggestions() {
  searchElements.suggestions.innerHTML = `
    <div class="loading-suggestion">
      <div class="loading-spinner"></div>
      Searching<span class="loading-dots"></span>
    </div>`;
  searchElements.suggestions.style.display = "block";
}

async function selectStudentBySrNumber(srNo) {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const isFromUrl = urlParams.get("sr_no") === srNo.toString();
    if (!isFromUrl) {
      lastSearchQuery = searchElements.searchBox.value.trim();
      isFromSearch = true;
      const newUrl = new URL(window.location);
      newUrl.searchParams.set("sr_no", srNo);
      window.history.pushState({ 
        fromSearch: true, 
        searchQuery: lastSearchQuery,
        studentId: srNo 
      }, "", newUrl);
    }
    const response = await fetch(`${API_BASE}/student/${srNo}/`);
    if (response.ok) {
      const student = await response.json();
      displayStudentDetails(student);
      searchElements.searchBox.value = student.name;
      hideSuggestions();
      if (isFromUrl) {
        cleanURL();
      }
    } else {
      showNoResults();
      if (!isFromUrl) cleanURL();
    }
  } catch (error) {
    showNoResults();
    cleanURL();
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
      { signal: controller.signal }
    );
    if (response.ok) {
      const students = await response.json();
      displaySuggestions(students);
    } else {
      hideSuggestions();
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      hideSuggestions();
    }
  } finally {
    currentRequest = null;
  }
}

function displaySuggestions(students) {
  searchElements.searchBox.parentElement.classList.remove('search-loading');
  if (students.length === 0) {
    hideSuggestions();
    return;
  }
  const fragment = document.createDocumentFragment();
  students.forEach((student) => {
    const div = document.createElement("div");
    div.className = "suggestion";
    if (student.opt_out) {
      div.classList.add("opt-out-suggestion");
    }
    div.dataset.studentId = student.sr_no || student.id;
    div.innerHTML = `
            <span>${student.opt_out ? '🔒 ' : ''}${student.name}</span>
            <span class="suggestion-department">${student.department || ""}</span>
        `;
    fragment.appendChild(div);
  });
  searchElements.suggestions.innerHTML = "";
  searchElements.suggestions.appendChild(fragment);
  searchElements.suggestions.style.display = "block";
  const suggestions = Array.from(searchElements.suggestions.children);
  searchElements.suggestions.classList.add('fade-in');
  suggestions.forEach((suggestion, index) => {
    suggestion.style.opacity = '0';
    suggestion.style.transform = 'translateY(-10px)';
    suggestion.style.transition = 'opacity 0.2s ease, transform 0.25s ease';
    setTimeout(() => {
      suggestion.style.opacity = '1';
      suggestion.style.transform = 'translateY(0)';
    }, 30 * index);
  });
}

async function selectStudent(srNo) {
  hideSuggestions();
  lastSearchQuery = searchElements.searchBox.value.trim();
  isFromSearch = true;
  const newUrl = new URL(window.location);
  newUrl.searchParams.set("sr_no", srNo);
  window.history.pushState({ 
    fromSearch: true, 
    searchQuery: lastSearchQuery,
    studentId: srNo 
  }, "", newUrl);
  searchElements.studentDetails.innerHTML = `
    <div class="student-card-loading">
      <div class="loading-spinner loading-spinner-large"></div>
      <div>Loading student details<span class="loading-dots"></span></div>
    </div>
  `;
  try {
    const response = await fetch(`${API_BASE}/student/${srNo}/`);
    if (response.ok) {
      const student = await response.json();
      displayStudentDetails(student);
      searchElements.searchBox.value = student.name;
    } else {
      showNoResults();
    }
  } catch (error) {
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
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
    age--;
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
  const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (today > next) next.setFullYear(today.getFullYear() + 1);
  const days = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  return days;
}

function displayStudentDetails(student) {
  const age = student.date_of_birth ? calculateAge(student.date_of_birth) : null;
  if (student.opt_out) {
    searchElements.studentDetails.innerHTML = createOptOutHTML(student);
    searchElements.studentDetails.firstElementChild.classList.add('fade-in');
    return;
  }
  searchElements.studentDetails.innerHTML = createStudentDetailsHTML(student, age);
  searchElements.studentDetails.firstElementChild.classList.add('fade-in');
  if (student.Instagram_id) {
    fetchInstagramData(student.sr_no);
  }
}

let currentInstagramRequest = null;
let currentInstagramSrNo = null;
let instagramCache = new Map();

async function fetchInstagramData(srNo) {
  if (instagramCache.has(srNo)) {
    updateInstagramSection(instagramCache.get(srNo));
    return;
  }
  if (currentInstagramRequest && currentInstagramSrNo === srNo) {
    return;
  }
  if (currentInstagramRequest && currentInstagramSrNo !== srNo) {
    currentInstagramRequest.abort();
  }
  const instagramInfo = document.querySelector('.instagram-info');
  if (instagramInfo && instagramInfo.innerHTML.trim() === '<!-- Instagram data will load here if available -->') {
    instagramInfo.innerHTML = `
      <div class="loading-spinner" style="width: 16px; height: 16px;"></div>
    `;
  }
  const controller = new AbortController();
  currentInstagramRequest = controller;
  currentInstagramSrNo = srNo;
  try {
    const response = await fetch(`${API_BASE}/instagram/?sr_no=${srNo}`, {
      method: 'POST',
      signal: controller.signal
    });
    if (response.ok) {
      const data = await response.json();
      instagramCache.set(srNo, data);
      updateInstagramSection(data);
    } else {
      if (instagramInfo) {
        instagramInfo.innerHTML = '';
      }
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      if (instagramInfo) {
        instagramInfo.innerHTML = '';
      }
    }
  } finally {
    currentInstagramRequest = null;
    currentInstagramSrNo = null;
  }
}
function updateInstagramSection(instagramData) {
  const instagramInfo = document.querySelector('.instagram-info');
  if (!instagramInfo) return;
  if (instagramInfo.innerHTML.trim() !== '' && !instagramInfo.innerHTML.includes('Instagram data will load here')) {
    instagramInfo.classList.add('fade-out');
  }
  const updateContent = () => {
    instagramInfo.innerHTML = '';
    const instagramContent = document.createElement('div');
    instagramContent.className = 'instagram-content fade-in';
    instagramContent.style.cssText = `
      display: flex; 
      align-items: center; 
      gap: 8px;
      margin-left: 8px;
      width: 100%;
    `;
    const profilePic = document.createElement('img');
    if (instagramData.profile_pic_data) {
      profilePic.src = instagramData.profile_pic_data;
    } else if (instagramData.profile_pic_url) {
      profilePic.src = instagramData.profile_pic_url;
    } else {
      profilePic.src = "";
    }
    profilePic.alt = `${instagramData.username}'s profile picture`;
    profilePic.style.cssText = `
      width: 32px; 
      height: 32px; 
      border-radius: 50%; 
      object-fit: cover; 
      border: 1px solid var(--border);
      flex-shrink: 0;
    `;
    profilePic.onerror = function() {
      this.style.display = 'none';
    };
    const statsDiv = document.createElement('div');
    statsDiv.className = 'instagram-stats';
    statsDiv.style.cssText = `
      font-size: 0.75rem; 
      color: var(--muted); 
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    const fullName = instagramData.full_name ? instagramData.full_name.trim() : '';
    const username = instagramData.username ? instagramData.username.trim() : '';
    statsDiv.innerHTML = `
      <div onclick="location.href='https://instagram.com/${username}'" style="font-weight: 500; font-size: larger; color: var(--text); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        @${username}
      </div>
      <div style="font-size: 0.8rem; white-space: wrap; overflow: hidden; text-overflow: ellipsis;">
        👥 ${instagramData.follower_count?.toLocaleString() || 0} followers • 
        📸 ${instagramData.media_count?.toLocaleString() || 0} posts • 
        ${instagramData.is_private ? '🔒 Private' : '🔓 Public'}
      </div>
    `;
    instagramContent.appendChild(profilePic);
    instagramContent.appendChild(statsDiv);
    instagramInfo.appendChild(instagramContent);
    instagramInfo.classList.remove('fade-out');
    const initialId = document.getElementById('initial-id');
    if (initialId) initialId.style.display = 'none';
  };
  if (instagramInfo.classList.contains('fade-out')) {
    setTimeout(updateContent, 300);
  } else {
    updateContent();
  }
}

function createOptOutHTML(student) {
  return `
        <div class="student-card">
            <div class="privacy-notice">
                <h2 class="student-name">${student.name}</h2>
                <h3>🔒 Privacy Protected</h3>
                <p>This student has chosen to keep their information private.</p>
                <small>Please respect their privacy preference.</small>
                <button class="btn" onclick="clearSearch()">Back to Search</button>
                <div class="opt-out-info">
                    <span class="opt-out-info"> <a href="#" onclick="toggleOptOut('${student.sr_no}')">Request to unhide your data? 🦇</a></span>
                </div>
            </div>
        </div>`;
}

function createLocalityVisualization(localityData) {
  if (typeof LocalityVisualizer === 'undefined') {
    console.error('LocalityVisualizer module not loaded');
    return '';
  }
  return LocalityVisualizer.create(localityData);
}

function createStudentDetailsHTML(student, age) {
  let instagramSection;
  if (student.Instagram_id) {
    const isContributor =
      navCurrentUser &&
      student.contributor &&
      navCurrentUser.email === student.contributor;
    instagramSection = `
      <div style="display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap;">
        <a id="initial-id" href="https://instagram.com/${student.Instagram_id}" target="_blank" class="btn btn-sm" style="text-decoration: none;">
          @${student.Instagram_id}
        </a>
        <div class="instagram-info" style="display: inline-flex; align-items: center; gap: var(--spacing-xs);">
        </div>
        ${
          isContributor
            ? `<span class="contributor-badge" style="font-size: 0.7rem; color: var(--muted); margin-left: auto;">contributed by you (respect++)</span>`
            : ""
        }
      </div>`;
  } else {
    instagramSection = `
      <span style="color: var(--muted);">Instagram not available</span>
      <button onclick="showInstagramContribution('${student.sr_no}')" class="btn btn-sm" style="margin-left: var(--spacing-sm);">
        Contribute
      </button>`;
  }
  
  const localityTags = [student.street, student.street2, student.district]
    .filter(Boolean)
    .map((loc) => `<span class="loc-box">${loc}</span>`)
    .join("");
  
  // Create locality visualization using the separate module
  const localityVisualization = createLocalityVisualization({
    street: student.street,
    street2: student.street2,
    district: student.district
  });
  
  const dobSection = student.date_of_birth
    ? (() => {
        const dob = new Date(student.date_of_birth);
        return `<p><span style="font-weight:500;">DOB:</span> ${dob.getDate().toString().padStart(2, "0")}/${(dob.getMonth() + 1).toString().padStart(2, "0")}/${dob.getFullYear()} 
            <span class="age-info">${age} years old${age < 18 ? " 🚩" : ""}</span></p>
            <p><span style="font-weight:500;">Days until next birthday:</span> ${getDaysUntilNextBirthday(student.date_of_birth)} days</p>`;
      })()
    : "DOB not available";
    
  return `
        <div class="student-card card">
            <h2 class="student-name">${student.name}</h2>
            <div class="social-links">
                <div class="social-id">
                    <span class="social-platform">Instagram</span>
                    ${instagramSection}
                </div>
                <div class="social-id">
                    <span class="social-platform">Phone</span>
                    ${navCurrentUser ? (
                      student.father_mobile
                        ? `<a href="tel:${student.father_mobile}" style="color: var(--text);">${student.father_mobile}</a>`
                        : "Phone number not available 📱"
                    ) : `<a href="/sign_in?next=/search/?sr_no=${student.sr_no}" style="color: var(--text);">  ${student.father_mobile.replace(/\d{5}$/, "XXXXX")} <button class="btn btn-sm" style="margin-left: var(--spacing-xs);">login</button></a>`}
                </div>
                <div class="locality">
                    <span class="social-platform">Locality</span>
                    ${localityVisualization}
                    <div class="locality-tags">${localityTags}</div>
                </div>
            </div>
            ${
              student.department
                ? `<p><strong>Department:</strong> ${student.department}</p>`
                : ""
            }
            ${dobSection}
            <p class="opt-out-info"> 
                <span class="opt-out-info"> <a href="#" onclick="confirmOptOut('${student.sr_no}')" style="color: var(--muted-light);">Request to hide your data?</a></span>
            </p>
            <button class="btn" onclick="clearSearch()">Clear Results</button>
            <div id="contribute-instagram-form" style="display:none; margin-top: var(--spacing-md);"></div>
        </div>`;
}

function confirmOptOut(srNo) {
  const existingPopup = document.getElementById("optout-confirm-popup");
  if (existingPopup) return;
  const popup = document.createElement("div");
  popup.id = "optout-confirm-popup";
  popup.innerHTML = `
    <div class="popup-card">
      <h3>Hide Your Profile?</h3>
      <div class="popup-desc">
        Hiding your data means no one can find you—not even your future stalker<br>
        <span style="color:#c62828; font-size:0.8rem">(Your crush is gonna think <br>you dropped out Frr 💀 )</span>
        <br>Are you that <em>shy</em> ?<br>
      </div>
      <button id="optout-confirm-btn" class="popup-btn-secondary">Yehh 🕵️‍♂️</button>
      <button id="optout-cancel-btn" class="popup-btn-primary">Never Mind 😎</button>
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
  if (query.length === 0) {
    openBarcodeScanner();
    return;
  }
  searchElements.searchBox.parentElement.classList.add('search-loading');
  if (/^\d+$/.test(query)) {
    await selectStudentBySrNumber(query);
    return;
  }
  if (autocompleteCache) {
    const searchTerm = query.toLowerCase();
    const scoredResults = autocompleteCache.map(student => {
      const nameScore = fuzzyScore(searchTerm, student.name);
      return { student, score: nameScore };
    })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score);
    const exactMatch = scoredResults.find(
      result => result.student.name.toLowerCase() === searchTerm
    );
    const targetStudent = exactMatch ? exactMatch.student : scoredResults[0]?.student;
    if (targetStudent) {
      await selectStudentBySrNumber(targetStudent.sr_no);
    } else {
      showNoResults();
    }
  } else {
    try {
      const response = await fetch(`${API_BASE}/autocomplete/?q=${encodeURIComponent(query)}`);
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
      showNoResults();
    }
  }
  hideSuggestions();
}

function showNoResults() {
  searchElements.studentDetails.innerHTML = `
        <div class="student-card card fade-in">
            <div class="no-results">
                <h3>🔍 No student found</h3>
                <p>No student found with that name. Try searching for someone else!</p>
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
  const studentDetails = searchElements.studentDetails;
  if (studentDetails.firstElementChild) {
    studentDetails.firstElementChild.classList.add('fade-out');
    setTimeout(() => {
      studentDetails.innerHTML = "";
    }, 300);
  } else {
    studentDetails.innerHTML = "";
  }
  isFromSearch = false;
  lastSearchQuery = "";
  cleanURL();
  searchElements.searchBox.parentElement.classList.remove('search-loading');
}

function hideSuggestions() {
  const suggestions = searchElements.suggestions;
  if (suggestions.style.display !== "none") {
    suggestions.classList.add('fade-out');
    setTimeout(() => {
      suggestions.style.display = "none";
      suggestions.innerHTML = "";
      suggestions.classList.remove('fade-out', 'fade-in');
    }, 300);
  }
  searchElements.searchBox.parentElement.classList.remove('search-loading');
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
  const isLoggedIn = navCurrentUser?.email;
  popup.innerHTML = `
    <div class="ig-popup-card">
      <h3>Contribute Instagram ID</h3>
      <div class="ig-popup-desc">
        ${
          isLoggedIn
            ? `<em style="font-size: 0.8rem;"> Contributing as <strong style="font-size: .7rem; color: var(--text);">${navCurrentUser.email}</strong></em>
            <p style="color: var(--muted-light); font-size:0.6rem"> Your contribution will be kept anonymous 🛡️</p>`
            : `<span> <a href="/sign_in?next=/search/" style="color: #c62828; text-decoration:none">Login to contribute <button style="margin-left: 4px; padding: 1px 4px; font-size: 1rem;">Login</button></a></span>`
        }
      </div>
      <input type="text" id="popupInstagramInput" placeholder="Instagram ID without '@'" ${isLoggedIn ? "" : "disabled"}>
      <div id="popupResponseMsg" style="margin-bottom: 1rem;"></div>
      <button id="popupSubmitBtn" class="popup-btn-primary" ${isLoggedIn ? "" : "disabled"}>Submit</button>
      <button id="popupCancelBtn" class="popup-btn-secondary">Cancel</button>
    </div>`;
  document.body.appendChild(popup);
  document.getElementById("popupInstagramInput").focus();
  document.getElementById("popupCancelBtn").onclick = () => document.body.removeChild(popup);
  document.getElementById("popupSubmitBtn").onclick = () => handleInstagramSubmit(sr_no, popup);
}

async function handleInstagramSubmit(sr_no, popup) {
  const input = document.getElementById("popupInstagramInput");
  const responseMsg = document.getElementById("popupResponseMsg");
  const submitBtn = document.getElementById("popupSubmitBtn");
  
  const instagramId = input.value.trim();
  
  if (!instagramId) {
    responseMsg.innerHTML = '<span style="color: #c62828;">Please enter an Instagram ID</span>';
    return;
  }
  
  // Remove @ if user included it
  const cleanId = instagramId.replace(/^@/, '');
  
  if (!/^[a-zA-Z0-9._]+$/.test(cleanId)) {
    responseMsg.innerHTML = '<span style="color: #c62828;">Invalid Instagram ID format</span>';
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";
  responseMsg.innerHTML = '<span style="color: var(--muted);">Submitting...</span>';
  
  try {
    const response = await fetch(`${API_BASE}/contribute/instagram/${sr_no}/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({
        instagram_id: cleanId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      responseMsg.innerHTML = '<span style="color: #4caf50;">✓ Thank you for contributing!</span>';
      setTimeout(() => {
        document.body.removeChild(popup);
        // Refresh the student details to show the new Instagram ID
        selectStudentBySrNumber(sr_no);
      }, 1500);
    } else {
      const error = await response.json();
      responseMsg.innerHTML = `<span style="color: #c62828;">${error.error || error.detail || 'Failed to submit'}</span>`;
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  } catch (error) {
    responseMsg.innerHTML = '<span style="color: #c62828;">Network error. Please try again.</span>';
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

function openBarcodeScanner() {
  const gestureStartHandler = e => e.preventDefault();
  const touchMoveHandler = e => e.preventDefault();
  document.addEventListener('gesturestart', gestureStartHandler, { passive: false });
  document.addEventListener('touchmove', touchMoveHandler, { passive: false });
  const scannerContainer = document.createElement('div');
  scannerContainer.id = 'barcode-scanner-container';
  scannerContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 18px;">
      <div style="color: #fff; font-size: 1.15rem; font-weight: 600; margin-bottom: 0.5em;">
        Scan ID
      </div>
      <div id="reader"></div>
      <div id="scan-overlay" style="display:none"></div>
      <button id="close-scanner-btn">Close</button>
    </div>
  `;
  document.body.appendChild(scannerContainer);
  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    try {
      if (window.html5QrCodeInstance) {
        window.html5QrCodeInstance.stop().catch(() => {});
        window.html5QrCodeInstance.clear().catch(() => {});
        window.html5QrCodeInstance = null;
      }
    } catch {}
    try {
      if (document.body.contains(scannerContainer)) {
        document.body.removeChild(scannerContainer);
      }
    } catch {}
    document.removeEventListener('gesturestart', gestureStartHandler);
    document.removeEventListener('touchmove', touchMoveHandler);
  };
  document.getElementById('close-scanner-btn').onclick = cleanup;
  scannerContainer.onclick = e => { if (e.target === scannerContainer) cleanup(); };
  window.addEventListener('beforeunload', cleanup, { once: true });
  setTimeout(cleanup, 5 * 60 * 1000);
  const overlay = document.getElementById("scan-overlay");
  if (typeof Html5Qrcode === "undefined") {
    overlay.style.display = "block";
    overlay.textContent = "";
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () => initializeScanner(overlay, cleanup);
    script.onerror = () => {
      overlay.style.display = "block";
      overlay.textContent = "Failed to load barcode scanner.";
      overlay.innerHTML += '<br><button id="fallback-close" style="margin-top:10px;padding:5px 10px;cursor:pointer;">Close</button>';
      document.getElementById('fallback-close').onclick = cleanup;
    };
    document.head.appendChild(script);
  } else {
    initializeScanner(overlay, cleanup);
  }
}

function initializeScanner(overlay, cleanup) {
  try {
    const html5QrCode = new Html5Qrcode("reader");
    window.html5QrCodeInstance = html5QrCode;
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 12 },
      (decodedText) => {
        if (/^\d+$/.test(decodedText)) {
          try { selectStudentBySrNumber(decodedText); } catch {}
          setTimeout(cleanup, 900);
        }
      },
      () => {}
    ).catch(err => {
      overlay.style.display = "block";
      overlay.innerHTML = `<span style="color: #f44">Camera error: ${err}</span>`;
      overlay.innerHTML += '<br><button id="fallback-close" style="margin-top:10px;padding:5px 10px;cursor:pointer;">Close</button>';
      document.getElementById('fallback-close').onclick = cleanup;
    });
  } catch (error) {
    overlay.style.display = "block";
    overlay.innerHTML = `<span style="color: #f44">Scanner error: ${error.message}</span>`;
    overlay.innerHTML += '<br><button id="fallback-close" style="margin-top:10px;padding:5px 10px;cursor:pointer;">Close</button>';
    document.getElementById('fallback-close').onclick = cleanup;
  }
}

window.addEventListener('popstate', (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  const srNo = urlParams.get("sr_no");
  if (event.state && event.state.fromSearch && !srNo) {
    restoreSearchState(event.state.searchQuery);
  } else if (srNo) {
    isFromSearch = false;
    selectStudentBySrNumber(srNo);
  } else {
    restoreSearchState("");
  }
});

function restoreSearchState(searchQuery) {
  const studentDetails = searchElements.studentDetails;
  if (studentDetails.firstElementChild) {
    studentDetails.firstElementChild.classList.add('fade-out');
    setTimeout(() => {
      studentDetails.innerHTML = "";
    }, 300);
  } else {
    studentDetails.innerHTML = "";
  }
  if (searchQuery && searchQuery.trim()) {
    searchElements.searchBox.value = searchQuery;
    searchElements.searchBox.focus();
    setTimeout(() => {
      if (autocompleteCache) {
        searchFromCache(searchQuery);
      }
    }, 100);
  } else {
    searchElements.searchBox.value = "";
    searchElements.searchBox.focus();
    hideSuggestions();
  }
  isFromSearch = false;
  lastSearchQuery = "";
  cleanURL();
  searchElements.searchBox.parentElement.classList.remove('search-loading');
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (searchElements.suggestions.style.display !== 'none') {
      hideSuggestions();
    } else if (searchElements.studentDetails.innerHTML.trim() !== '') {
      if (isFromSearch && lastSearchQuery) {
        window.history.back();
      } else {
        goBackToSearch();
      }
    }
  }
});

let isFromSearch = false;
let lastSearchQuery = "";

function goBackToSearch() {
  const studentDetails = searchElements.studentDetails;
  if (studentDetails.firstElementChild) {
    studentDetails.firstElementChild.classList.add('fade-out');
    setTimeout(() => {
      studentDetails.innerHTML = "";
    }, 300);
  } else {
    studentDetails.innerHTML = "";
  }
  searchElements.searchBox.value = "";
  searchElements.searchBox.focus();
  hideSuggestions();
  isFromSearch = false;
  lastSearchQuery = "";
  cleanURL();
  searchElements.searchBox.parentElement.classList.remove('search-loading');
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.history.state) {
    window.history.replaceState({ initial: true }, "", window.location.href);
  }
  
  initializePage();
});

function textScrambleSimple(el, phrases) {
  let counter = 0, frame = 0, queue = [];
  const chars = 'abcdefghijklmnopqrstuvwxyz';

  function randomChar() {
    return chars[Math.floor(Math.random() * chars.length)];
  }
  
  function nextPhrase() {
    const oldText = el.innerText;
    const newText = phrases[counter];
    const length = Math.max(oldText.length, newText.length);
    queue = [];

    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 60);
      const end = start + Math.floor(Math.random() * 40);
      queue.push({ from, to, start, end, char: null });
    }
    frame = 0;
    update();
  }

  function update() {
    let output = '', complete = 0;
    for (let i = 0; i < queue.length; i++) {
      let { from, to, start, end, char } = queue[i];
      if (frame >= end) {
        complete++;
        output += to;
      } else if (frame >= start) {
        if (!char || Math.random() < 0.38) {
          char = randomChar();
          queue[i].char = char;
        }
        output += char;
      } else {
        output += from;
      }
    }
    el.innerText = output;
    if (complete === queue.length) {
      counter = (counter + 1) % phrases.length;
      setTimeout(nextPhrase, 3000);
    } else {
      requestAnimationFrame(update);
      frame++;
    }
  }

  nextPhrase();
}

textScrambleSimple(document.querySelector('.scramble-text'), ['classmates',
                                                             'benchmates',
                                                             'soulmates',
                                                             'friends',
                                                             'femboys',
                                                             'tomboys',
                                                             'furries',
                                                             'crush',
                                                             'bestie',
                                                             'stalker',
                                                             'ex']);
