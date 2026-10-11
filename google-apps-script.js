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
  var fileName = (data.fileName || "submission").trim();
  var fileType = data.mimeType || data.fileType || "application/octet-stream";
  var fileDataBase64 = data.base64Data || data.fileData;

  if (!studentName || !regNo) {
    return jsonResponse({ status: "error", message: "Student Name and Register Number are required." });
  }

  if (!fileDataBase64) {
    return jsonResponse({ status: "error", message: "No file content was provided." });
  }

  // Strip Base64 Data URL header if present (e.g. data:application/pdf;base64,...)
  var base64Index = fileDataBase64.indexOf("base64,");
  if (base64Index !== -1) {
    fileDataBase64 = fileDataBase64.substring(base64Index + 7);
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

  // Decode file bytes and construct file blob
  var decodedBytes = Utilities.base64Decode(fileDataBase64);
  
  // Keep file name strictly as the actual original file name (no extra student details prepended)
  var cleanFileName = fileName;
  
  var blob = Utilities.newBlob(decodedBytes, fileType, cleanFileName);
  var file = folder.createFile(blob);

  // Set file metadata in Drive
  var timeZone = Session.getScriptTimeZone() || "Asia/Kolkata";
  var formattedTime = Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd HH:mm:ss");
  
  file.setDescription(
    "Nunnokku Sustainability Observation Submission\n" +
    "---------------------------------------------------\n" +
    "Student Name: " + studentName + "\n" +
    "Register/Roll No: " + regNo + "\n" +
    "Department: " + department + "\n" +
    "Year of Study: " + year + "\n" +
    "LinkedIn: " + linkedin + "\n" +
    "Submitted At: " + formattedTime + "\n" +
    "Original File: " + fileName
  );

  var fileUrl = file.getUrl();
  var fileId = file.getId();

  // Log record to Google Sheet in the same folder
  logToSheet(folder, [
    formattedTime,
    studentName,
    regNo,
    department,
    year,
    linkedin,
    cleanFileName,
    fileUrl,
    fileId
  ]);

  return jsonResponse({
    status: "success",
    message: "Observation successfully submitted!",
    fileName: cleanFileName,
    fileUrl: fileUrl,
    fileId: fileId,
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

    // Row 0 is headers [Timestamp, Name, Reg No, Department, Year, LinkedIn, File Name, Drive Link, File ID]
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] || row[1]) {
        submissions.push({
          timestamp: row[0],
          name: row[1],
          regNo: row[2],
          department: row[3],
          year: row[4],
          linkedin: row[5],
          fileName: row[6],
          fileUrl: row[7],
          fileId: row[8]
        });
      }
    }
  } catch (sheetErr) {
    Logger.log("Notice: Google Sheet read skipped/failed: " + sheetErr.toString());
  }

  // Attempt 2: If sheet had no records or wasn't accessible, fallback to scanning Drive files directly
  if (submissions.length === 0) {
    try {
      var filesIter = folder.getFiles();
      while (filesIter.hasNext()) {
        var f = filesIter.next();
        var fName = f.getName();
        // Skip the log sheet itself
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

        submissions.push({
          timestamp: timeMatch ? timeMatch[1].trim() : Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
          name: nameMatch ? nameMatch[1].trim() : "Participant",
          regNo: regMatch ? regMatch[1].trim() : "-",
          department: deptMatch ? deptMatch[1].trim() : "-",
          year: yearMatch ? yearMatch[1].trim() : "-",
          linkedin: liMatch ? liMatch[1].trim() : "-",
          fileName: fName,
          fileUrl: f.getUrl(),
          fileId: f.getId()
        });
      }
    } catch (folderErr) {
      Logger.log("Notice: Folder scan: " + folderErr.toString());
    }
  }

  // Reverse so newest submissions appear first
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

  // Check if exists in root
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
    "File Name",
    "Drive File Link",
    "File ID"
  ]);

  // Style header row
  try {
    var headerRange = activeSheet.getRange(1, 1, 1, 9);
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
