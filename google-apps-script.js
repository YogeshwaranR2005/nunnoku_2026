/**
 * =========================================================================
 * NUNNOKKU (நுண்ணோக்கு) — GOOGLE APPS SCRIPT BACKEND
 * IUCEE EWB TCE Student Chapter
 * =========================================================================
 * 
 * --- SETUP INSTRUCTIONS (5 MINUTES) ---
 * 
 * 1. GET YOUR GOOGLE DRIVE FOLDER ID:
 *    - Open Google Drive and go into the folder where you want submissions stored.
 *    - Look at the browser URL:
 *      https://drive.google.com/drive/folders/1ABC_xyz123-yourFolderIdHere
 *    - Copy the folder ID string (everything after /folders/).
 *    - Paste it into FOLDER_ID below.
 * 
 * 2. SET UP GOOGLE APPS SCRIPT:
 *    - Open https://script.google.com
 *    - Click "New project" (rename it to "Nunnokku API").
 *    - Replace all existing code in 'Code.gs' with this entire file.
 *    - Update FOLDER_ID and CREATOR_PASSCODE below.
 *    - Click "Save" (Ctrl + S).
 * 
 * 3. DEPLOY AS WEB APP:
 *    - Click "Deploy" (blue button at top right) -> "New deployment".
 *    - Click the gear icon (Select type) -> choose "Web app".
 *    - Configure the deployment:
 *      * Description: "Nunnokku Submissions API v1"
 *      * Execute as: "Me" (your Google account)
 *      * Who has access: "Anyone" (CRITICAL: this allows students to submit without needing to log in)
 *    - Click "Deploy".
 *    - Authorize access when prompted ("Review permissions" -> Choose your account -> "Advanced" -> "Go to Nunnokku API (unsafe)" -> "Allow").
 *    - Copy the generated "Web app URL" (ends with /exec).
 * 
 * 4. CONNECT TO YOUR WEBSITE:
 *    - Open 'script.js' in your UI Nunnoku project.
 *    - Paste the Web App URL into:
 *      const APPS_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
 *    - Match the CREATOR_PASSCODE if you changed it.
 *    - That's it! Your website is live and ready for submissions.
 * =========================================================================
 */

// ==========================================
// CONFIGURATION (EDIT THESE TWO VALUES)
// ==========================================
const FOLDER_ID = "19Fz5dP-hQolfqGO4Phb431_vhfUcmlip"; // Destination Google Drive folder
const CREATOR_PASSCODE = "nunnokku2026";             // Passcode for the Creator Portal
const SHEET_NAME = "Nunnokku_Submissions_Log";       // Tracking spreadsheet auto-created in folder

/**
 * ONE-TIME SETUP FUNCTION (RUN THIS ONCE IN APPS SCRIPT EDITOR):
 * 1. Select 'setupSheet' in the dropdown next to the 'Run' button at the top.
 * 2. Click 'Run' (play icon).
 * 3. Authorize permissions when prompted ('Review permissions' -> Account -> 'Advanced' -> 'Allow').
 * 4. This will immediately authorize Google Sheets and create 'Nunnokku_Submissions_Log' in your Drive folder!
 */
function setupSheet() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var sheet = getOrCreateLogSheet(folder);
  Logger.log("SUCCESS! Sheet created / connected: " + sheet.getParent().getUrl());

  // Retroactively sync any files already in folder into the sheet
  var filesIter = folder.getFiles();
  var existingIds = [];
  try {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][8]) existingIds.push(String(data[i][8]));
    }
  } catch (e) {}

  var syncedCount = 0;
  while (filesIter.hasNext()) {
    var f = filesIter.next();
    var fId = f.getId();
    if (f.getName() === SHEET_NAME || f.getMimeType() === "application/vnd.google-apps.spreadsheet") continue;
    if (existingIds.indexOf(String(fId)) === -1) {
      var desc = f.getDescription() || "";
      var nameMatch = desc.match(/Student Name:\s*(.+)/);
      var regMatch = desc.match(/Register\/Roll No:\s*(.+)/);
      var deptMatch = desc.match(/Department:\s*(.+)/);
      var yearMatch = desc.match(/Year of Study:\s*(.+)/);
      var liMatch = desc.match(/LinkedIn:\s*(.+)/);
      var timeMatch = desc.match(/Submitted At:\s*(.+)/);

      sheet.appendRow([
        timeMatch ? timeMatch[1].trim() : Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
        nameMatch ? nameMatch[1].trim() : "Participant",
        regMatch ? regMatch[1].trim() : "-",
        deptMatch ? deptMatch[1].trim() : "-",
        yearMatch ? yearMatch[1].trim() : "-",
        liMatch ? liMatch[1].trim() : "-",
        f.getName(),
        f.getUrl(),
        fId
      ]);
      syncedCount++;
    }
  }
  Logger.log("Done! Synced " + syncedCount + " existing files to the sheet.");
}

// ==========================================
// HTTP HANDLERS
// ==========================================

/**
 * Handles incoming POST requests (File Uploads & Creator Queries)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ status: "error", message: "No data payload received." });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "upload";

    if (action === "upload") {
      return handleUpload(payload);
    } else if (action === "list") {
      return handleList(payload.passcode);
    } else {
      return jsonResponse({ status: "error", message: "Invalid action specified." });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: "Server error: " + err.toString() });
  }
}

/**
 * Handles incoming GET requests (Health check & Creator Queries)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || "ping";

    if (action === "ping") {
      return jsonResponse({
        status: "success",
        message: "Nunnokku Apps Script API is online and running."
      });
    } else if (action === "list") {
      return handleList(params.passcode);
    }

    return jsonResponse({ status: "error", message: "Unknown action." });
  } catch (err) {
    return jsonResponse({ status: "error", message: "Server error: " + err.toString() });
  }
}

// ==========================================
// LOGIC: FILE UPLOAD
// ==========================================

function handleUpload(data) {
  var studentName = (data.name || "").trim();
  var regNo = (data.regNo || "").trim();
  var department = (data.department || "").trim();
  var year = (data.year || "").trim();
  var linkedin = (data.linkedin || "").trim();

  if (!studentName || !regNo) {
    return jsonResponse({ status: "error", message: "Student Name and Register Number are required." });
  }

  // Retrieve destination Google Drive folder
  var folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch (folderErr) {
    return jsonResponse({
      status: "error",
      message: "Could not access Drive folder. Please verify FOLDER_ID in Code.gs."
    });
  }

  var timeZone = Session.getScriptTimeZone() || "Asia/Kolkata";
  var formattedTime = Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd HH:mm:ss");

  function buildDesc(role, origName) {
    return "Nunnokku Sustainability Observation Submission\n" +
           "---------------------------------------------------\n" +
           "Submission Role: " + role + "\n" +
           "Student Name: " + studentName + "\n" +
           "Register/Roll No: " + regNo + "\n" +
           "Department: " + department + "\n" +
           "Year of Study: " + year + "\n" +
           "LinkedIn: " + linkedin + "\n" +
           "Submitted At: " + formattedTime + "\n" +
           "Original File: " + origName;
  }

  var docName = "";
  var docUrl = "";
  var docId = "";

  // 1. Process Reflection Document Object
  var docObj = data.doc;
  if (!docObj && data.base64Data && !data.photos) {
    // Legacy single-file fallback
    docObj = {
      base64Data: data.base64Data,
      fileName: data.fileName,
      mimeType: data.mimeType
    };
  }

  if (docObj && docObj.fileName) {
    docName = (docObj.fileName || "writeup.docx").trim();
  }

  // 2. Create Dedicated Subfolder in Drive named after the file name
  // E.g. "antenna poster -triangular"
  var subFolderName = docName ? docName.replace(/\.[^/.]+$/, "").trim() : "";
  if (!subFolderName) subFolderName = docName || (studentName + " - Observation");

  var targetFolder;
  try {
    targetFolder = folder.createFolder(subFolderName);
    targetFolder.setDescription(
      "Nunnokku Sustainability Observation Submission\n" +
      "---------------------------------------------------\n" +
      "Student Name: " + studentName + "\n" +
      "Register/Roll No: " + regNo + "\n" +
      "Department: " + department + "\n" +
      "Year of Study: " + year + "\n" +
      "LinkedIn: " + linkedin + "\n" +
      "Submitted At: " + formattedTime + "\n" +
      "Document File: " + docName
    );
  } catch (createFolderErr) {
    targetFolder = folder; // Fallback to parent folder if creation fails
  }

  var targetFolderUrl = targetFolder.getUrl();

  // 3. Save Reflection Document inside targetFolder
  if (docObj && docObj.base64Data) {
    var rawDocB64 = docObj.base64Data;
    var b64Idx = rawDocB64.indexOf("base64,");
    if (b64Idx !== -1) rawDocB64 = rawDocB64.substring(b64Idx + 7);

    var docBytes = Utilities.base64Decode(rawDocB64);
    var docMime = docObj.mimeType || "application/octet-stream";
    var docBlob = Utilities.newBlob(docBytes, docMime, docName || "writeup.docx");
    var docFile = targetFolder.createFile(docBlob);
    docFile.setDescription(buildDesc("Observation Write-up Document", docName));
    docUrl = docFile.getUrl();
    docId = docFile.getId();
  }

  // 4. Save Observation Photograph(s) inside targetFolder
  var photoList = data.photos || [];
  if (data.photo) photoList.push(data.photo);

  var savedPhotos = [];
  for (var i = 0; i < photoList.length; i++) {
    var pObj = photoList[i];
    if (pObj && pObj.base64Data) {
      var rawPB64 = pObj.base64Data;
      var pIdx = rawPB64.indexOf("base64,");
      if (pIdx !== -1) rawPB64 = rawPB64.substring(pIdx + 7);

      var pBytes = Utilities.base64Decode(rawPB64);
      var pName = (pObj.fileName || "observation_photo_" + (i + 1) + ".jpg").trim();
      var pMime = pObj.mimeType || "image/jpeg";
      var pBlob = Utilities.newBlob(pBytes, pMime, pName);
      var pFile = targetFolder.createFile(pBlob);
      pFile.setDescription(buildDesc("Observation Photograph (" + (i + 1) + ")", pName));
      savedPhotos.push({
        fileName: pName,
        fileUrl: pFile.getUrl(),
        fileId: pFile.getId()
      });
    }
  }

  var photoNamesStr = savedPhotos.map(function(p) { return p.fileName; }).join(", ");
  var photoUrlsStr = savedPhotos.map(function(p) { return p.fileUrl; }).join(", ");
  var photoIdsStr = savedPhotos.map(function(p) { return p.fileId; }).join(", ");

  // 5. Log to Google Sheet
  // Columns: [Timestamp, Student Name, Register No, Department, Year, LinkedIn, Doc Name, Doc Link, Photo Names, Photo Links, Folder Link, Doc ID, Photo IDs]
  logToSheet(folder, [
    formattedTime,
    studentName,
    regNo,
    department,
    year,
    linkedin,
    docName || "-",
    docUrl || "-",
    photoNamesStr || "-",
    photoUrlsStr || "-",
    targetFolderUrl || "-",
    docId || "-",
    photoIdsStr || "-"
  ]);

  return jsonResponse({
    status: "success",
    message: "Observation successfully submitted!",
    docName: docName,
    docUrl: docUrl,
    folderUrl: targetFolderUrl,
    photos: savedPhotos,
    timestamp: formattedTime
  });
}

// ==========================================
// LOGIC: CREATOR LIST & ACCESS
// ==========================================

function handleList(providedPasscode) {
  if (!providedPasscode || providedPasscode !== CREATOR_PASSCODE) {
    return jsonResponse({ status: "error", message: "Unauthorized: Invalid creator passcode." });
  }

  var folder;
  try {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } catch (err) {
    return jsonResponse({ status: "error", message: "Could not access Drive folder." });
  }

  var submissions = [];

  // Attempt 1: Read from Google Sheet
  try {
    var sheet = getOrCreateLogSheet(folder);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] || row[1]) {
        var isNewSchema = data[0].length >= 10 && String(data[0][6]).indexOf("Document") !== -1;
        
        var docName = isNewSchema ? (row[6] || "") : (row[6] || "");
        var docUrl = isNewSchema ? (row[7] || "") : (row[7] || "");
        var photoNames = isNewSchema ? (row[8] || "") : "";
        var photoUrls = isNewSchema ? (row[9] || "") : "";
        var folderUrl = isNewSchema && row[10] ? row[10] : "";

        submissions.push({
          timestamp: row[0],
          name: row[1],
          regNo: row[2],
          department: row[3],
          year: row[4],
          linkedin: row[5],
          docName: docName,
          docUrl: docUrl,
          photoNames: photoNames,
          photoUrls: photoUrls,
          folderUrl: folderUrl,
          // Compatibility fallbacks
          fileName: docName || photoNames || "File",
          fileUrl: docUrl || (photoUrls ? photoUrls.split(",")[0].trim() : "#")
        });
      }
    }
  } catch (sheetErr) {
    Logger.log("Notice: Google Sheet read skipped/failed: " + sheetErr.toString());
  }

  // Attempt 2: Fallback to scanning Drive folder files directly
  if (submissions.length === 0) {
    try {
      var filesIter = folder.getFiles();
      while (filesIter.hasNext()) {
        var f = filesIter.next();
        var fName = f.getName();
        if (fName === SHEET_NAME || f.getMimeType() === "application/vnd.google-apps.spreadsheet") {
          continue;
        }

        var desc = f.getDescription() || "";
        var nameMatch = desc.match(/Student Name:\s*(.+)/);
        var regMatch = desc.match(/Register\/Roll No:\s*(.+)/);
        var deptMatch = desc.match(/Department:\s*(.+)/);
        var yearMatch = desc.match(/Year of Study:\s*(.+)/);
        var liMatch = desc.match(/LinkedIn:\s*(.+)/);
        var timeMatch = desc.match(/Submitted At:\s*(.+)/);
        var roleMatch = desc.match(/Submission Role:\s*(.+)/);

        var isPhoto = (roleMatch && roleMatch[1].indexOf("Photo") !== -1) ||
                      f.getMimeType().indexOf("image/") === 0;

        submissions.push({
          timestamp: timeMatch ? timeMatch[1].trim() : Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
          name: nameMatch ? nameMatch[1].trim() : "Participant",
          regNo: regMatch ? regMatch[1].trim() : "-",
          department: deptMatch ? deptMatch[1].trim() : "-",
          year: yearMatch ? yearMatch[1].trim() : "-",
          linkedin: liMatch ? liMatch[1].trim() : "-",
          docName: isPhoto ? "" : fName,
          docUrl: isPhoto ? "" : f.getUrl(),
          photoNames: isPhoto ? fName : "",
          photoUrls: isPhoto ? f.getUrl() : "",
          fileName: fName,
          fileUrl: f.getUrl(),
          fileId: f.getId()
        });
      }
    } catch (folderErr) {
      Logger.log("Notice: Folder scan: " + folderErr.toString());
    }
  }

  submissions.reverse();

  return jsonResponse({
    status: "success",
    folderUrl: folder.getUrl(),
    count: submissions.length,
    submissions: submissions
  });
}

// ==========================================
// HELPER: SPREADSHEET LOGGING
// ==========================================

function getOrCreateLogSheet(folder) {
  var files = folder.getFilesByName(SHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next()).getActiveSheet();
  }

  // Check if exists in root Drive
  var rootFiles = DriveApp.getFilesByName(SHEET_NAME);
  if (rootFiles.hasNext()) {
    var rootFile = rootFiles.next();
    try {
      rootFile.moveTo(folder);
    } catch (e) {}
    return SpreadsheetApp.open(rootFile).getActiveSheet();
  }

  // Create new tracking sheet directly in the Drive folder
  var newSpreadsheet = SpreadsheetApp.create(SHEET_NAME);
  var sheetFile = DriveApp.getFileById(newSpreadsheet.getId());
  try {
    sheetFile.moveTo(folder);
  } catch (e) {
    try {
      folder.addFile(sheetFile);
      DriveApp.getRootFolder().removeFile(sheetFile);
    } catch (e2) {}
  }

  var activeSheet = newSpreadsheet.getActiveSheet();
  activeSheet.appendRow([
    "Timestamp",
    "Student Name",
    "Register No",
    "Department",
    "Year of Study",
    "LinkedIn Profile",
    "Document Name",
    "Document Link",
    "Photo Names",
    "Photo Links",
    "Submission Folder Link",
    "Doc ID",
    "Photo IDs"
  ]);

  // Style header row (13 columns)
  try {
    var headerRange = activeSheet.getRange(1, 1, 1, 13);
    headerRange.setBackground("#1F4433");
    headerRange.setFontColor("#FAF5EA");
    headerRange.setFontWeight("bold");
    activeSheet.setFrozenRows(1);
  } catch (styleErr) {}

  return activeSheet;
}

function logToSheet(folder, rowData) {
  try {
    var sheet = getOrCreateLogSheet(folder);
    sheet.appendRow(rowData);
  } catch (err) {
    Logger.log("Failed to log to sheet: " + err.toString());
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
