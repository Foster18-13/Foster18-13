const NOTE_STORAGE_KEY = "portalNoteContent";

function showNoteSaveStatus(message) {
  const status = document.getElementById("note-save-status");
  if (status) {
    status.textContent = message;
  }
}

function loadNote() {
  const noteArea = document.getElementById("note-area");
  if (!noteArea) return;
  noteArea.value = localStorage.getItem(NOTE_STORAGE_KEY) || "";
}

function saveNote() {
  const noteArea = document.getElementById("note-area");
  if (!noteArea) return;
  const noteValue = noteArea.value || "";
  localStorage.setItem(NOTE_STORAGE_KEY, noteValue);
  if (typeof globalThis.cloudSyncSaveKey === "function") {
    globalThis.cloudSyncSaveKey(NOTE_STORAGE_KEY, noteValue);
  }
  showNoteSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
}

async function initNotePage() {
  if (typeof globalThis.cloudSyncHydrate === "function") {
    await globalThis.cloudSyncHydrate([NOTE_STORAGE_KEY, "portalProductList"]);
  }
  renderNav(location.pathname);
  loadNote();
  const saveBtn = document.getElementById("save-note-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveNote);
  }
}

globalThis.addEventListener("DOMContentLoaded", initNotePage);
