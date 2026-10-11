/* =========================================================
   NUNNOKKU (நுண்ணோக்கு) — IUCEE EWB TCE Student Chapter
   Frontend Script: Submissions, File Uploads & Creator Portal
   ========================================================= */

// =========================================================
// 1. CONFIGURATION (EDIT THESE VALUES)
// =========================================================

// Google Apps Script Web App URL (ends in /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw6AKPrMkuItfA8wDkEnIT2LnBByjAhY2iDsRWib3MHMQGskU0speyXKt8cK2-sACo0/exec";

// Creator Passcode (must match CREATOR_PASSCODE in google-apps-script.js)
const CREATOR_PASSCODE = "nunnokku2026";

// Direct Creator Google Drive Folder link
const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/19Fz5dP-hQolfqGO4Phb431_vhfUcmlip";

// Sample document link (LinkedIn post)
const EXAMPLE_URL = "https://www.linkedin.com/posts/ietsc_nunnoku-sustainability-biogas-ugcPost-7514996785770086400-_ATa/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAE7gDmEBt5pXlXGit9f7jyPxDKz20_A8V6I";

// Chapter LinkedIn Profile
const LINKEDIN_URL = "https://www.linkedin.com/in/ietsc/";

// Maximum upload file size (15 MB in bytes)
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// =========================================================
// 2. MAIN CONTROLLER
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Static external links
  const exampleLink = document.getElementById("example-link");
  if (exampleLink) exampleLink.href = EXAMPLE_URL;

  const linkedinLink = document.getElementById("linkedin-link");
  if (linkedinLink) linkedinLink.href = LINKEDIN_URL;

  // Initialize features
  initScrollAnimations();
  initUploadForm();
  initCreatorPortal();
});

// =========================================================
// 3. SCROLL REVEAL ANIMATIONS
// =========================================================
function initScrollAnimations() {
  const revealTargets = document.querySelectorAll(".band, .hero");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }
}

// =========================================================
// 4. STUDENT SUBMISSION & FILE UPLOAD
// =========================================================
function initUploadForm() {
  const form = document.getElementById("submission-form");
  if (!form) return;

  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const filePreview = document.getElementById("file-preview");
  const fileNameText = document.getElementById("file-name-text");
  const fileSizeText = document.getElementById("file-size-text");
  const fileExtBadge = document.getElementById("file-ext-badge");
  const removeFileBtn = document.getElementById("remove-file-btn");
  const errorBanner = document.getElementById("form-error-banner");

  const progressState = document.getElementById("upload-progress-state");
  const successState = document.getElementById("upload-success-state");
  const summaryBox = document.getElementById("submission-summary");
  const submitAnotherBtn = document.getElementById("submit-another-btn");

  let currentFile = null;

  // Click on dropzone opens native file picker
  dropZone.addEventListener("click", () => fileInput.click());

  // Keyboard accessibility for dropzone
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Drag and Drop events
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("dragover");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleSelectedFile(dt.files[0]);
    }
  });

  // File input change
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // Remove file selection
  removeFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSelectedFile();
  });

  function clearSelectedFile() {
    currentFile = null;
    fileInput.value = "";
    filePreview.classList.add("hidden");
    dropZone.classList.remove("hidden");
    hideError();
  }

  function handleSelectedFile(file) {
    hideError();

    // Size limit check (15 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is 15 MB.`);
      clearSelectedFile();
      return;
    }

    // Supported extensions check
    const allowedExtensions = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
    const fileExt = "." + file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      showError("Unsupported file type. Please upload a PDF, Word document (.docx, .doc), or photo (.jpg, .png).");
      clearSelectedFile();
      return;
    }

    currentFile = file;

    // Update preview card
    fileNameText.textContent = file.name;
    fileSizeText.textContent = formatFileSize(file.size);
    fileExtBadge.textContent = fileExt.replace(".", "").toUpperCase();

    dropZone.classList.add("hidden");
    filePreview.classList.remove("hidden");
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove("hidden");
  }

  function hideError() {
    errorBanner.textContent = "";
    errorBanner.classList.add("hidden");
  }

  // Form submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById("student-name").value.trim();
    const regNo = document.getElementById("student-reg").value.trim();
    const department = document.getElementById("student-dept").value;
    const year = document.getElementById("student-year").value;
    const linkedin = document.getElementById("student-linkedin").value.trim();

    if (!name || !regNo || !department || !year || !linkedin) {
      showError("Please fill out all required student details including your LinkedIn ID.");
      return;
    }

    if (!currentFile) {
      showError("Please attach your observation file before submitting.");
      return;
    }

    // Friendly reminder if Apps Script URL has not been configured yet
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
      showError(
        "Setup needed: Please paste your deployed Google Apps Script Web App URL into APPS_SCRIPT_URL in script.js to start receiving submissions in your Google Drive."
      );
      return;
    }

    // Switch to loading progress view
    form.classList.add("hidden");
    progressState.classList.remove("hidden");

    try {
      // Read file bytes as base64 and strip Data URL prefix
      const rawBase64 = await readFileAsBase64(currentFile);
      const cleanBase64 = rawBase64.includes("base64,") ? rawBase64.split("base64,")[1] : rawBase64;

      // Keep file name strictly as the actual uploaded file name (no student prefixes)
      const payload = {
        action: "upload",
        base64Data: cleanBase64,
        mimeType: currentFile.type || "application/octet-stream",
        fileName: currentFile.name,
        name: name,
        regNo: regNo,
        department: department,
        year: year,
        linkedin: linkedin
      };

      // POST to Google Apps Script (using text/plain to prevent CORS preflight OPTIONS rejection)
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === "success") {
        // Show success state
        progressState.classList.add("hidden");
        successState.classList.remove("hidden");

        const cleanLi = linkedin.trim();
        const liUrl = cleanLi ? (cleanLi.startsWith("http") ? cleanLi : "https://linkedin.com/in/" + cleanLi.replace(/^@/, "")) : "";

        summaryBox.innerHTML = `
          <div><strong>Student:</strong> ${escapeHtml(name)} (${escapeHtml(regNo)})</div>
          <div><strong>Department:</strong> ${escapeHtml(department)} &bull; ${escapeHtml(year)}</div>
          <div><strong>LinkedIn:</strong> ${liUrl ? `<a href="${escapeHtml(liUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleanLi)}</a>` : "Not provided"}</div>
          <div><strong>File:</strong> ${escapeHtml(currentFile.name)}</div>
        `;

        form.reset();
        clearSelectedFile();
      } else {
        throw new Error(result.message || "Failed to upload to Google Drive.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      progressState.classList.add("hidden");
      form.classList.remove("hidden");
      showError(`Submission error: ${err.message || "Could not complete upload. Please check your internet connection."}`);
    }
  });

  // Submit another observation button
  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener("click", () => {
      successState.classList.add("hidden");
      form.classList.remove("hidden");
      clearSelectedFile();
    });
  }
}

// =========================================================
// 5. CREATOR PORTAL CONTROLLER
// =========================================================
function initCreatorPortal() {
  const headerBtn = document.getElementById("header-creator-btn");
  const footerBtn = document.getElementById("footer-creator-btn");
  const modal = document.getElementById("creator-modal");
  if (!modal) return;

  const closeBtn = document.getElementById("close-creator-btn");

  const authPanel = document.getElementById("creator-auth-panel");
  const dashPanel = document.getElementById("creator-dashboard-panel");
  const authForm = document.getElementById("creator-auth-form");
  const passcodeInput = document.getElementById("creator-passcode-input");
  const authError = document.getElementById("auth-error-msg");

  const countBadge = document.getElementById("submission-count");
  const driveFolderLink = document.getElementById("drive-folder-link");
  const refreshBtn = document.getElementById("refresh-submissions-btn");
  const lockBtn = document.getElementById("creator-lock-btn");
  const searchInput = document.getElementById("creator-search-input");
  const listContainer = document.getElementById("submissions-list-container");

  let submissionsCache = [];
  let currentPasscode = "";

  // Open modal
  function openModal() {
    modal.classList.remove("hidden");
    if (currentPasscode) {
      showDashboard();
    } else {
      showAuth();
      setTimeout(() => passcodeInput.focus(), 150);
    }
  }

  // Close modal
  function closeModal() {
    modal.classList.add("hidden");
  }

  if (headerBtn) headerBtn.addEventListener("click", openModal);
  if (footerBtn) footerBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  function showAuth() {
    authPanel.classList.remove("hidden");
    dashPanel.classList.add("hidden");
    authError.classList.add("hidden");
  }

  function showDashboard() {
    authPanel.classList.add("hidden");
    dashPanel.classList.remove("hidden");
  }

  // Unlock portal with passcode
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = passcodeInput.value.trim();

    if (entered === CREATOR_PASSCODE) {
      currentPasscode = entered;
      authError.classList.add("hidden");
      showDashboard();
      fetchSubmissions();
    } else {
      authError.textContent = "Incorrect passcode. Please verify your creator passcode.";
      authError.classList.remove("hidden");
      passcodeInput.focus();
    }
  });

  // Lock portal
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      currentPasscode = "";
      passcodeInput.value = "";
      submissionsCache = [];
      showAuth();
    });
  }

  // Refresh submissions
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      fetchSubmissions();
    });
  }

  // Live search filtering
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      filterSubmissions(searchInput.value.trim().toLowerCase());
    });
  }

  // Fetch submissions from Apps Script
  async function fetchSubmissions() {
    listContainer.innerHTML = `
      <div class="dash-empty">
        <div class="state-spinner"></div>
        <p style="margin-top:0.8rem;">Loading student submissions from Google Drive...</p>
      </div>
    `;

    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
      listContainer.innerHTML = `
        <div class="dash-empty">
          <p>Please configure your deployed <strong>APPS_SCRIPT_URL</strong> in <code>script.js</code>.</p>
        </div>
      `;
      return;
    }

    driveFolderLink.href = DRIVE_FOLDER_URL;

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "list", passcode: currentPasscode })
      });

      const data = await response.json();

      if (data.status === "success") {
        submissionsCache = data.submissions || [];
        countBadge.textContent = submissionsCache.length;

        if (data.folderUrl) {
          driveFolderLink.href = data.folderUrl;
        }

        renderSubmissions(submissionsCache);
      } else {
        throw new Error(data.message || "Failed to fetch submissions list.");
      }
    } catch (err) {
      console.warn("Submissions list notice:", err);
      listContainer.innerHTML = `
        <div class="dash-empty">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" style="margin-bottom:0.75rem; color:var(--green);">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3 style="margin:0 0 0.5rem; color:var(--green-deep); font-family:var(--serif-tamil);">All Submissions in Google Drive</h3>
          <p style="font-size:0.9rem; max-width:44ch; margin:0 auto 1.1rem; color:var(--ink-soft);">
            All student files are saved and organized with their name, roll number, and department in your Drive folder.
          </p>
          <a href="${DRIVE_FOLDER_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
            <span>Open Google Drive Folder ↗</span>
          </a>
        </div>
      `;
    }
  }

  function filterSubmissions(query) {
    if (!query) {
      renderSubmissions(submissionsCache);
      return;
    }

    const filtered = submissionsCache.filter((sub) => {
      const name = (sub.name || "").toLowerCase();
      const reg = (sub.regNo || "").toLowerCase();
      const dept = (sub.department || "").toLowerCase();
      const file = (sub.fileName || "").toLowerCase();
      return name.includes(query) || reg.includes(query) || dept.includes(query) || file.includes(query);
    });

    renderSubmissions(filtered);
  }

  function renderSubmissions(items) {
    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div class="dash-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>No submissions found yet.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items
      .map((sub) => {
        const timeFormatted = sub.timestamp ? escapeHtml(sub.timestamp) : "";
        return `
          <div class="submission-item">
            <div class="sub-primary">
              <div class="sub-header">
                <span class="sub-name">${escapeHtml(sub.name || "Anonymous")}</span>
                <span class="sub-badge">${escapeHtml(sub.regNo || "N/A")}</span>
                <span class="sub-badge">${escapeHtml(sub.department || "Dept")}</span>
              </div>
              <div class="sub-meta">
                <span>Year: ${escapeHtml(sub.year || "-")}</span>
                <span>&bull;</span>
                <span>${escapeHtml(sub.fileName || "File")}</span>
                <span>&bull;</span>
                <span>${timeFormatted}</span>
              </div>
            </div>
            <div class="sub-actions">
              <a href="${escapeHtml(sub.fileUrl || "#")}" target="_blank" rel="noopener noreferrer" class="sub-link-btn" title="Open file in Google Drive">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <span>View</span>
              </a>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

// =========================================================
// 6. UTILITY FUNCTIONS
// =========================================================

/**
 * Converts a File or Blob into a Base64 string data URL
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Formats byte size into human-readable string (KB, MB)
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Escapes HTML characters to prevent XSS in dynamic rendering
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}