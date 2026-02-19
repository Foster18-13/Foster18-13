const NOTE_STORAGE_KEY = "portalNoteContent";

function loadNote() {
  const noteArea = document.getElementById("note-area");
  if (!noteArea) return;
  noteArea.value = localStorage.getItem(NOTE_STORAGE_KEY) || "";
}

function saveNote() {
  const noteArea = document.getElementById("note-area");
  if (!noteArea) return;
  localStorage.setItem(NOTE_STORAGE_KEY, noteArea.value || "");
}

window.addEventListener("DOMContentLoaded", () => {
  renderNav(location.pathname);
  loadNote();
  const noteArea = document.getElementById("note-area");
  if (noteArea) {
    noteArea.addEventListener("input", saveNote);
  }
});
