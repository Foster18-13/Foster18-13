const NOTE_STORAGE_KEY = "portalNoteContent";
const DAILY_NOTE_STORAGE_KEY = "dailyPortalNoteContent";
let noteAutoSaveTimer = null;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getSelectedNoteDate() {
  const dateInput = document.getElementById("note-date");
  return dateInput?.value || todayIsoDate();
}

function showNoteSaveStatus(message) {
  const status = document.getElementById("note-save-status");
  if (status) {
    status.textContent = message;
  }
}

function readDailyNotes() {
  try {
    const raw = localStorage.getItem(DAILY_NOTE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDailyNotes(records) {
  localStorage.setItem(DAILY_NOTE_STORAGE_KEY, JSON.stringify(records));
}

function loadNote() {
  const dateKey = getSelectedNoteDate();
  const noteArea = document.getElementById("note-area");
  if (!noteArea) return;
  const dailyNotes = readDailyNotes();
  const noteValue = dailyNotes[dateKey] ?? localStorage.getItem(NOTE_STORAGE_KEY) ?? "";
  noteArea.value = noteValue;
}

function saveNote(showStatus = true) {
  const dateKey = getSelectedNoteDate();
  const noteArea = document.getElementById("note-area");
  if (!noteArea) return;
  const noteValue = noteArea.value || "";
  const dailyNotes = readDailyNotes();
  dailyNotes[dateKey] = noteValue;

  localStorage.setItem(NOTE_STORAGE_KEY, noteValue);
  writeDailyNotes(dailyNotes);
  if (showStatus) {
    showNoteSaveStatus(`Saved note for ${dateKey}`);
  }
}

function queueAutoSaveNote() {
  if (noteAutoSaveTimer) {
    clearTimeout(noteAutoSaveTimer);
  }
  noteAutoSaveTimer = setTimeout(() => {
    saveNote(false);
    showNoteSaveStatus(`Auto-saved note for ${getSelectedNoteDate()}`);
  }, 1200);
}

async function loadNoteRecord() {
  loadNote();
  showNoteSaveStatus(`Loaded note for ${getSelectedNoteDate()}`);
}

async function initNotePage() {
  renderNav(location.pathname);
  const dateInput = document.getElementById("note-date");
  if (dateInput) {
    dateInput.value = todayIsoDate();
    dateInput.addEventListener("change", loadNoteRecord);
  }

  loadNote();

  const saveBtn = document.getElementById("save-note-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => saveNote(true));
  }

  const loadBtn = document.getElementById("load-note-btn");
  if (loadBtn) {
    loadBtn.addEventListener("click", loadNoteRecord);
  }

  const noteArea = document.getElementById("note-area");
  if (noteArea) {
    noteArea.addEventListener("input", queueAutoSaveNote);
  }

  setInterval(() => {
    saveNote(false);
  }, 120000);
}

globalThis.addEventListener("DOMContentLoaded", initNotePage);
