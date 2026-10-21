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

  // Document uploader elements
  const docDropZone = document.getElementById("doc-drop-zone");
  const docInput = document.getElementById("doc-input");
  const docPreview = document.getElementById("doc-preview");
  const docNameText = document.getElementById("doc-name-text");
  const docSizeText = document.getElementById("doc-size-text");
  const docExtBadge = document.getElementById("doc-ext-badge");
  const removeDocBtn = document.getElementById("remove-doc-btn");

  // Photo uploader elements
  const photoDropZone = document.getElementById("photo-drop-zone");
  const photoInput = document.getElementById("photo-input");
  const photosPreviewContainer = document.getElementById("photos-preview-container");
  const photosGalleryList = document.getElementById("photos-gallery-list");
  const photosCountLabel = document.getElementById("photos-count-label");
  const addMorePhotosBtn = document.getElementById("add-more-photos-btn");

  // General feedback and state elements
  const errorBanner = document.getElementById("form-error-banner");
  const progressState = document.getElementById("upload-progress-state");
  const successState = document.getElementById("upload-success-state");
  const summaryBox = document.getElementById("submission-summary");
  const submitAnotherBtn = document.getElementById("submit-another-btn");

  let currentDocFile = null;
  let currentPhotoFiles = [];

  // ==========================================
  // 1. DOCUMENT UPLOADER LOGIC
  // ==========================================
  if (docDropZone && docInput) {
    docDropZone.addEventListener("click", () => docInput.click());

    docDropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        docInput.click();
      }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      docDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        docDropZone.classList.add("dragover");
      });
    });

    ["dragleave", "dragend", "drop"].forEach((eventName) => {
      docDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        docDropZone.classList.remove("dragover");
      });
    });

    docDropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleSelectedDoc(dt.files[0]);
      }
    });

    docInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleSelectedDoc(e.target.files[0]);
      }
    });
  }

  if (removeDocBtn) {
    removeDocBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelectedDoc();
    });
  }

  function clearSelectedDoc() {
    currentDocFile = null;
    if (docInput) docInput.value = "";
    if (docPreview) docPreview.classList.add("hidden");
    if (docDropZone) docDropZone.classList.remove("hidden");
    hideError();
  }

  function handleSelectedDoc(file) {
    hideError();

    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError(`Document is too large (${formatFileSize(file.size)}). Maximum allowed size is 15 MB.`);
      clearSelectedDoc();
      return;
    }

    const allowedDocExts = [".pdf", ".doc", ".docx"];
    const fileExt = "." + file.name.split(".").pop().toLowerCase();
    if (!allowedDocExts.includes(fileExt)) {
      showError("Unsupported document type. Please upload a PDF or Word document (.pdf, .docx, .doc).");
      clearSelectedDoc();
      return;
    }

    currentDocFile = file;
    if (docNameText) docNameText.textContent = file.name;
    if (docSizeText) docSizeText.textContent = formatFileSize(file.size);
    if (docExtBadge) docExtBadge.textContent = fileExt.replace(".", "").toUpperCase();

    if (docDropZone) docDropZone.classList.add("hidden");
    if (docPreview) docPreview.classList.remove("hidden");
  }

  // ==========================================
  // 2. OBSERVATION PHOTOS UPLOADER LOGIC
  // ==========================================
  if (photoDropZone && photoInput) {
    photoDropZone.addEventListener("click", () => photoInput.click());

    photoDropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        photoInput.click();
      }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      photoDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoDropZone.classList.add("dragover");
      });
    });

    ["dragleave", "dragend", "drop"].forEach((eventName) => {
      photoDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoDropZone.classList.remove("dragover");
      });
    });

    photoDropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleSelectedPhotos(Array.from(dt.files));
      }
    });

    photoInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleSelectedPhotos(Array.from(e.target.files));
      }
    });
  }

  if (addMorePhotosBtn && photoInput) {
    addMorePhotosBtn.addEventListener("click", () => photoInput.click());
  }

  function handleSelectedPhotos(files) {
    hideError();
    const allowedPhotoExts = [".jpg", ".jpeg", ".png", ".webp"];

    for (const file of files) {
      const fileExt = "." + file.name.split(".").pop().toLowerCase();
      if (!allowedPhotoExts.includes(fileExt)) {
        showError(`"${file.name}" is not a supported image. Please upload JPG, PNG, or WEBP photos.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        showError(`"${file.name}" exceeds the 15 MB limit.`);
        continue;
      }

      // Avoid duplicate file entries
      const exists = currentPhotoFiles.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        currentPhotoFiles.push(file);
      }
    }

    renderPhotosGallery();
  }

  function removePhotoAtIndex(idx) {
    if (idx >= 0 && idx < currentPhotoFiles.length) {
      currentPhotoFiles.splice(idx, 1);
      renderPhotosGallery();
    }
  }

  function renderPhotosGallery() {
    if (!photosGalleryList) return;

    if (currentPhotoFiles.length === 0) {
      if (photosPreviewContainer) photosPreviewContainer.classList.add("hidden");
      if (photoDropZone) photoDropZone.classList.remove("hidden");
      return;
    }

    if (photosCountLabel) {
      photosCountLabel.textContent = `Selected Photos (${currentPhotoFiles.length})`;
    }

    photosGalleryList.innerHTML = "";

    currentPhotoFiles.forEach((file, idx) => {
      const item = document.createElement("div");
      item.className = "photo-gallery-item";

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "photo-thumb-wrap";

      const img = document.createElement("img");
      img.className = "photo-thumb-img";
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(img.src);
      thumbWrap.appendChild(img);

      const meta = document.createElement("div");
      meta.className = "photo-item-meta";
      meta.innerHTML = `
        <span class="photo-item-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="photo-item-size">${formatFileSize(file.size)}</span>
      `;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove-photo-item";
      removeBtn.setAttribute("aria-label", `Remove ${file.name}`);
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removePhotoAtIndex(idx);
      });

      item.appendChild(thumbWrap);
      item.appendChild(meta);
      item.appendChild(removeBtn);
      photosGalleryList.appendChild(item);
    });

    if (photosPreviewContainer) photosPreviewContainer.classList.remove("hidden");
    if (photoDropZone) photoDropZone.classList.remove("hidden");
  }

  function clearAllUploads() {
    clearSelectedDoc();
    currentPhotoFiles = [];
    if (photoInput) photoInput.value = "";
    renderPhotosGallery();
  }

  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.classList.remove("hidden");
    }
  }

  function hideError() {
    if (errorBanner) {
      errorBanner.textContent = "";
      errorBanner.classList.add("hidden");
    }
  }

  // ==========================================
  // 3. FORM SUBMISSION HANDLER
  // ==========================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById("student-name").value.trim();
    const regNo = document.getElementById("student-reg").value.trim();
    const department = document.getElementById("student-dept").value;
    const year = document.getElementById("student-year").value;
    const phoneInput = document.getElementById("student-phone");
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const linkedin = document.getElementById("student-linkedin").value.trim();

    if (!name || !regNo || !department || !year || !phone || !linkedin) {
      showError("Please fill out all required student details including your Phone Number and LinkedIn ID.");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      showError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!currentDocFile) {
      showError("Please upload your reflection write-up document (.pdf, .docx, .doc) in Step 1.");
      return;
    }

    if (currentPhotoFiles.length === 0) {
      showError("Please upload at least one photograph of the observation in Step 2.");
      return;
    }

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
      // 1. Encode write-up document to Base64
      const rawDocBase64 = await readFileAsBase64(currentDocFile);
      const cleanDocBase64 = rawDocBase64.includes("base64,") ? rawDocBase64.split("base64,")[1] : rawDocBase64;

      // 2. Encode all photos to Base64 in parallel
      const photoPayloads = await Promise.all(
        currentPhotoFiles.map(async (photo) => {
          const rawPhotoBase64 = await readFileAsBase64(photo);
          const cleanPhotoBase64 = rawPhotoBase64.includes("base64,") ? rawPhotoBase64.split("base64,")[1] : rawPhotoBase64;
          return {
            base64Data: cleanPhotoBase64,
            fileName: photo.name,
            mimeType: photo.type || "image/jpeg"
          };
        })
      );

      const payload = {
        action: "upload",
        name: name,
        regNo: regNo,
        department: department,
        year: year,
        phone: phone,
        linkedin: linkedin,
        doc: {
          base64Data: cleanDocBase64,
          fileName: currentDocFile.name,
          mimeType: currentDocFile.type || "application/octet-stream"
        },
        photos: photoPayloads
      };

      // POST to Google Apps Script (using text/plain to prevent CORS preflight rejection)
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === "success") {
        progressState.classList.add("hidden");
        successState.classList.remove("hidden");

        const cleanLi = linkedin.trim();
        const liUrl = cleanLi ? (cleanLi.startsWith("http") ? cleanLi : "https://linkedin.com/in/" + cleanLi.replace(/^@/, "")) : "";
        const photoNames = currentPhotoFiles.map(f => f.name).join(", ");

        summaryBox.innerHTML = `
          <div><strong>Student:</strong> ${escapeHtml(name)} (${escapeHtml(regNo)})</div>
          <div><strong>Department:</strong> ${escapeHtml(department)} &bull; ${escapeHtml(year)}</div>
          <div><strong>Phone:</strong> ${escapeHtml(phone)}</div>
          <div><strong>LinkedIn:</strong> ${liUrl ? `<a href="${escapeHtml(liUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleanLi)}</a>` : "Not provided"}</div>
          <div><strong>Document:</strong> ${escapeHtml(currentDocFile.name)}</div>
          <div><strong>Photograph(s):</strong> ${escapeHtml(photoNames)} (${currentPhotoFiles.length} photo${currentPhotoFiles.length > 1 ? "s" : ""})</div>
        `;

        form.reset();
        clearAllUploads();
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
      clearAllUploads();
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
      const phone = (sub.phone || "").toLowerCase();
      const file = (sub.fileName || "").toLowerCase();
      return name.includes(query) || reg.includes(query) || dept.includes(query) || phone.includes(query) || file.includes(query);
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
                ${sub.phone ? `<span>&bull;</span><span>📞 ${escapeHtml(sub.phone)}</span>` : ""}
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