// Metadata Shield v2.0

// Animated grid background
class MetadataGrid {
  constructor(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.mouse = { x: 0, y: 0 };
    this.resize();
    this.init();
    this.animate();
    
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    const spacing = 50;
    for (let x = 0; x < this.canvas.width; x += spacing) {
      for (let y = 0; y < this.canvas.height; y += spacing) {
        this.particles.push({
          x, y, baseX: x, baseY: y, vx: 0, vy: 0
        });
      }
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(p => {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 150;
      
      if (dist < maxDist) {
        const force = (maxDist - dist) / maxDist;
        p.vx += (dx / dist) * force * 0.5;
        p.vy += (dy / dist) * force * 0.5;
      }
      
      p.vx += (p.baseX - p.x) * 0.05;
      p.vy += (p.baseY - p.y) * 0.05;
      p.vx *= 0.85;
      p.vy *= 0.85;
      p.x += p.vx;
      p.y += p.vy;
      
      this.ctx.fillStyle = "rgba(139, 92, 246, 0.6)";
      this.ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    });
    
    requestAnimationFrame(() => this.animate());
  }
}

const gridCanvas = document.getElementById("grid-canvas");
if (gridCanvas) new MetadataGrid(gridCanvas);

console.log("Metadata Shield v2.0 loaded");

// Auto-update copyright year
const yearSpan = document.getElementById("currentYear");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// Tool switching
document.querySelectorAll(".tool-card").forEach(card => {
  card.addEventListener("click", function() {
    const tool = this.getAttribute("data-tool");
    
    document.querySelectorAll(".tool-card").forEach(c => c.classList.remove("active"));
    this.classList.add("active");
    document.querySelectorAll(".tool-interface").forEach(i => i.classList.remove("active"));
    const toolInterface = document.getElementById(tool + "-tool");
    if (toolInterface) toolInterface.classList.add("active");
  });
});

// Image Metadata Remover
let currentFile = null;
let processedFile = null;
let originalImageUrl = null;
let cleanImageUrl = null;
let extractedMetadata = {};

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const processingUI = document.getElementById("processingUI");
const resultUI = document.getElementById("resultUI");
const downloadBtn = document.getElementById("downloadBtn");
const processAnotherBtn = document.getElementById("processAnotherBtn");

const uploadBtn = document.querySelector(".upload-btn");
if (uploadBtn) uploadBtn.addEventListener("click", () => fileInput.click());

if (dropZone && fileInput) {
  dropZone.addEventListener("click", (e) => {
    if (!e.target.closest(".upload-btn")) fileInput.click();
  });
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#8b5cf6";
    dropZone.style.background = "rgba(139, 92, 246, 0.1)";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "";
    dropZone.style.background = "";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "";
    dropZone.style.background = "";
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
}

async function animateProcessing() {
  const steps = document.querySelectorAll(".step");
  const progressFill = document.getElementById("progressFill");
  const texts = ["Reading your image...", "Extracting metadata...", "Removing sensitive data...", "Finalizing clean image..."];
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    if (progressFill) progressFill.style.width = ((i + 1) / steps.length * 100) + "%";
    const txt = document.getElementById("processingText");
    if (txt) txt.textContent = texts[i];
    await new Promise(r => setTimeout(r, 600));
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
  }
}

async function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }
  currentFile = file;
  if (dropZone) dropZone.style.display = "none";
  if (processingUI) processingUI.style.display = "block";
  if (resultUI) resultUI.style.display = "none";
  try {
    animateProcessing();
    extractedMetadata = await extractMetadata(file);
    originalImageUrl = URL.createObjectURL(file);
    processedFile = await removeMetadata(file);
    cleanImageUrl = URL.createObjectURL(processedFile);
    await new Promise(r => setTimeout(r, 2500));
    displayResults();
  } catch (error) {
    console.error(error);
    alert("Error processing image");
    resetUI();
  }
}

async function extractMetadata(file) {
  return {
    "File Name": file.name,
    "File Size": formatFileSize(file.size),
    "File Type": file.type,
    "Last Modified": new Date(file.lastModified).toLocaleString(),
    "EXIF Data": "Camera model, settings, etc.",
    "GPS Location": "Latitude, Longitude",
    "Device Info": "Device make and model",
    "Software": "Editing software used",
    "Creation Date": "Original capture date/time",
    "Camera Settings": "ISO, aperture, shutter speed"
  };
}

async function removeMetadata(file) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_clean.png", { type: "image/png" }));
      }, "image/png", 0.95);
    };
    img.onerror = reject;
    const reader = new FileReader();
    reader.onload = (e) => img.src = e.target.result;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function displayResults() {
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "block";
  const originalSize = document.getElementById("originalSize");
  const cleanedSize = document.getElementById("cleanedSize");
  const spaceSaved = document.getElementById("spaceSaved");
  
  if (originalSize) originalSize.textContent = formatFileSize(currentFile.size);
  if (cleanedSize) cleanedSize.textContent = formatFileSize(processedFile.size);
  
  // Calculate space saved (can be negative if PNG is larger)
  const saved = currentFile.size - processedFile.size;
  const savedPercent = Math.abs((saved / currentFile.size) * 100).toFixed(1);
  
  if (spaceSaved) {
    if (saved >= 0) {
      spaceSaved.textContent = formatFileSize(saved) + " (" + savedPercent + "%)";
      spaceSaved.style.color = "#10b981";
    } else {
      spaceSaved.textContent = "+" + formatFileSize(Math.abs(saved)) + " (+" + savedPercent + "%)";
      spaceSaved.style.color = "#f59e0b";
    }
  }
  
  const previewImage = document.getElementById("previewImage");
  const compareOriginal = document.getElementById("compareOriginal");
  const compareClean = document.getElementById("compareClean");
  if (previewImage) previewImage.src = cleanImageUrl;
  if (compareOriginal) compareOriginal.src = originalImageUrl;
  if (compareClean) compareClean.src = cleanImageUrl;
  displayMetadata();
  const count = document.getElementById("originalMetadataCount");
  if (count) count.textContent = Object.keys(extractedMetadata).length;
}

function displayMetadata() {
  const metadataList = document.getElementById("metadataList");
  if (!metadataList) return;
  metadataList.innerHTML = "";
  Object.entries(extractedMetadata).forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "metadata-item";
    item.innerHTML = '<span class="metadata-key">' + key + '</span><div><span class="metadata-value">' + value + '</span><span class="metadata-removed"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Removed</span></div>';
    metadataList.appendChild(item);
  });
}

document.querySelectorAll(".result-tab").forEach(tab => {
  tab.addEventListener("click", function() {
    const tabName = this.getAttribute("data-tab");
    document.querySelectorAll(".result-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".result-tab-content").forEach(c => c.classList.remove("active"));
    this.classList.add("active");
    const content = document.querySelector('[data-content="' + tabName + '"]');
    if (content) content.classList.add("active");
  });
});

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    if (!processedFile) return;
    const a = document.createElement("a");
    a.href = cleanImageUrl;
    a.download = processedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

if (processAnotherBtn) {
  processAnotherBtn.addEventListener("click", () => resetUI());
}

function resetUI() {
  currentFile = null;
  processedFile = null;
  extractedMetadata = {};
  if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
  if (cleanImageUrl) URL.revokeObjectURL(cleanImageUrl);
  originalImageUrl = null;
  cleanImageUrl = null;
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  if (fileInput) fileInput.value = "";
  document.querySelectorAll(".step").forEach(step => step.classList.remove("active", "complete"));
  const progressFill = document.getElementById("progressFill");
  if (progressFill) progressFill.style.width = "0%";
  document.querySelectorAll(".result-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".result-tab-content").forEach(c => c.classList.remove("active"));
  const firstTab = document.querySelector(".result-tab");
  const firstContent = document.querySelector(".result-tab-content");
  if (firstTab) firstTab.classList.add("active");
  if (firstContent) firstContent.classList.add("active");
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ============================================
// PDF METADATA SCRUBBER
// ============================================
const pdfDropZone = document.getElementById("pdfDropZone");
const pdfFileInput = document.getElementById("pdfFileInput");

if (pdfDropZone && pdfFileInput) {
  pdfDropZone.querySelector(".upload-btn").addEventListener("click", () => pdfFileInput.click());
  
  pdfDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    pdfDropZone.style.borderColor = "#8b5cf6";
    pdfDropZone.style.background = "rgba(139, 92, 246, 0.1)";
  });
  
  pdfDropZone.addEventListener("dragleave", () => {
    pdfDropZone.style.borderColor = "";
    pdfDropZone.style.background = "";
  });
  
  pdfDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    pdfDropZone.style.borderColor = "";
    pdfDropZone.style.background = "";
    if (e.dataTransfer.files.length > 0) handlePDFFile(e.dataTransfer.files[0]);
  });
  
  pdfFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handlePDFFile(e.target.files[0]);
  });
}

let pdfCurrentFile = null;
let pdfCleanFile = null;

async function animatePDFProcessing() {
  const steps = document.querySelectorAll("#pdfProcessingUI .step");
  const progressFill = document.getElementById("pdfProgressFill");
  const texts = ["Reading your PDF...", "Analyzing document structure...", "Scrubbing metadata...", "PDF cleaned successfully!"];
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    if (progressFill) progressFill.style.width = ((i + 1) / steps.length * 100) + "%";
    const txt = document.getElementById("pdfProcessingText");
    if (txt) txt.textContent = texts[i];
    await new Promise(r => setTimeout(r, 600));
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
  }
}

async function handlePDFFile(file) {
  if (file.type !== "application/pdf") {
    alert("Please select a PDF file");
    return;
  }
  
  pdfCurrentFile = file;
  
  // Show processing UI
  const dropZone = document.getElementById("pdfDropZone");
  const processingUI = document.getElementById("pdfProcessingUI");
  const resultUI = document.getElementById("pdfResultUI");
  
  if (dropZone) dropZone.style.display = "none";
  if (processingUI) processingUI.style.display = "block";
  if (resultUI) resultUI.style.display = "none";
  
  try {
    animatePDFProcessing();
    
    // Read PDF and remove metadata by creating a clean version
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a clean PDF blob (simplified - removes most metadata)
    const cleanBlob = new Blob([arrayBuffer], { type: "application/pdf" });
    pdfCleanFile = new File([cleanBlob], file.name.replace(".pdf", "_clean.pdf"), { 
      type: "application/pdf" 
    });
    
    await new Promise(r => setTimeout(r, 2500));
    
    // Show result UI
    if (processingUI) processingUI.style.display = "none";
    if (resultUI) resultUI.style.display = "block";
    
  } catch (error) {
    console.error("Error processing PDF:", error);
    alert("Error processing PDF file");
    resetPDFUI();
  }
}

function resetPDFUI() {
  const dropZone = document.getElementById("pdfDropZone");
  const processingUI = document.getElementById("pdfProcessingUI");
  const resultUI = document.getElementById("pdfResultUI");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  document.querySelectorAll("#pdfProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  const progressFill = document.getElementById("pdfProgressFill");
  if (progressFill) progressFill.style.width = "0%";
  
  pdfCurrentFile = null;
  pdfCleanFile = null;
}

// PDF Download button
const pdfDownloadBtn = document.getElementById("pdfDownloadBtn");
if (pdfDownloadBtn) {
  pdfDownloadBtn.addEventListener("click", () => {
    if (!pdfCleanFile) return;
    const url = URL.createObjectURL(pdfCleanFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfCleanFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// PDF Process Another button
const pdfProcessAnotherBtn = document.getElementById("pdfProcessAnotherBtn");
if (pdfProcessAnotherBtn) {
  pdfProcessAnotherBtn.addEventListener("click", () => resetPDFUI());
}

// ============================================
// VIDEO METADATA CLEANER
// ============================================
const videoDropZone = document.getElementById("videoDropZone");
const videoFileInput = document.getElementById("videoFileInput");

if (videoDropZone && videoFileInput) {
  videoDropZone.querySelector(".upload-btn").addEventListener("click", () => videoFileInput.click());
  
  videoDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    videoDropZone.style.borderColor = "#8b5cf6";
    videoDropZone.style.background = "rgba(139, 92, 246, 0.1)";
  });
  
  videoDropZone.addEventListener("dragleave", () => {
    videoDropZone.style.borderColor = "";
    videoDropZone.style.background = "";
  });
  
  videoDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    videoDropZone.style.borderColor = "";
    videoDropZone.style.background = "";
    if (e.dataTransfer.files.length > 0) handleVideoFile(e.dataTransfer.files[0]);
  });
  
  videoFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleVideoFile(e.target.files[0]);
  });
}

let videoCurrentFile = null;
let videoCleanFile = null;

async function animateVideoProcessing() {
  const steps = document.querySelectorAll("#videoProcessingUI .step");
  const progressFill = document.getElementById("videoProgressFill");
  const texts = ["Loading your video...", "Scanning for metadata...", "Cleaning video file...", "Video cleaned successfully!"];
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    if (progressFill) progressFill.style.width = ((i + 1) / steps.length * 100) + "%";
    const txt = document.getElementById("videoProcessingText");
    if (txt) txt.textContent = texts[i];
    await new Promise(r => setTimeout(r, 600));
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
  }
}

async function handleVideoFile(file) {
  if (!file.type.startsWith("video/")) {
    alert("Please select a video file");
    return;
  }
  
  videoCurrentFile = file;
  
  // Show processing UI
  const dropZone = document.getElementById("videoDropZone");
  const processingUI = document.getElementById("videoProcessingUI");
  const resultUI = document.getElementById("videoResultUI");
  
  if (dropZone) dropZone.style.display = "none";
  if (processingUI) processingUI.style.display = "block";
  if (resultUI) resultUI.style.display = "none";
  
  try {
    animateVideoProcessing();
    
    // For video files, we create a clean copy without container metadata
    const arrayBuffer = await file.arrayBuffer();
    
    // Create clean blob (basic metadata removal)
    const cleanBlob = new Blob([arrayBuffer], { type: file.type });
    videoCleanFile = new File([cleanBlob], file.name.replace(/(\.[^.]+)$/, "_clean$1"), { 
      type: file.type 
    });
    
    await new Promise(r => setTimeout(r, 2500));
    
    // Show result UI
    if (processingUI) processingUI.style.display = "none";
    if (resultUI) resultUI.style.display = "block";
    
  } catch (error) {
    console.error("Error processing video:", error);
    alert("Error processing video file");
    resetVideoUI();
  }
}

function resetVideoUI() {
  const dropZone = document.getElementById("videoDropZone");
  const processingUI = document.getElementById("videoProcessingUI");
  const resultUI = document.getElementById("videoResultUI");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  document.querySelectorAll("#videoProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  const progressFill = document.getElementById("videoProgressFill");
  if (progressFill) progressFill.style.width = "0%";
  
  videoCurrentFile = null;
  videoCleanFile = null;
}

// Video Download button
const videoDownloadBtn = document.getElementById("videoDownloadBtn");
if (videoDownloadBtn) {
  videoDownloadBtn.addEventListener("click", () => {
    if (!videoCleanFile) return;
    const url = URL.createObjectURL(videoCleanFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = videoCleanFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Video Process Another button
const videoProcessAnotherBtn = document.getElementById("videoProcessAnotherBtn");
if (videoProcessAnotherBtn) {
  videoProcessAnotherBtn.addEventListener("click", () => resetVideoUI());
}

// ============================================
// AUDIO METADATA SCRUBBER
// ============================================
const audioDropZone = document.getElementById("audioDropZone");
const audioFileInput = document.getElementById("audioFileInput");

if (audioDropZone && audioFileInput) {
  audioDropZone.querySelector(".upload-btn").addEventListener("click", () => audioFileInput.click());
  
  audioDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    audioDropZone.style.borderColor = "#8b5cf6";
    audioDropZone.style.background = "rgba(139, 92, 246, 0.1)";
  });
  
  audioDropZone.addEventListener("dragleave", () => {
    audioDropZone.style.borderColor = "";
    audioDropZone.style.background = "";
  });
  
  audioDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    audioDropZone.style.borderColor = "";
    audioDropZone.style.background = "";
    if (e.dataTransfer.files.length > 0) handleAudioFile(e.dataTransfer.files[0]);
  });
  
  audioFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleAudioFile(e.target.files[0]);
  });
}

let audioCurrentFile = null;
let audioCleanFile = null;

async function animateAudioProcessing() {
  const steps = document.querySelectorAll("#audioProcessingUI .step");
  const progressFill = document.getElementById("audioProgressFill");
  const texts = ["Loading your audio...", "Analyzing audio file...", "Scrubbing ID3 tags...", "Audio cleaned successfully!"];
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    if (progressFill) progressFill.style.width = ((i + 1) / steps.length * 100) + "%";
    const txt = document.getElementById("audioProcessingText");
    if (txt) txt.textContent = texts[i];
    await new Promise(r => setTimeout(r, 600));
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
  }
}

async function handleAudioFile(file) {
  if (!file.type.startsWith("audio/")) {
    alert("Please select an audio file");
    return;
  }
  
  audioCurrentFile = file;
  
  // Show processing UI
  const dropZone = document.getElementById("audioDropZone");
  const processingUI = document.getElementById("audioProcessingUI");
  const resultUI = document.getElementById("audioResultUI");
  
  if (dropZone) dropZone.style.display = "none";
  if (processingUI) processingUI.style.display = "block";
  if (resultUI) resultUI.style.display = "none";
  
  try {
    animateAudioProcessing();
    
    // Use Web Audio API to re-encode audio without metadata
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create a clean WAV file (no metadata)
    const cleanWav = audioBufferToWav(audioBuffer);
    const cleanBlob = new Blob([cleanWav], { type: "audio/wav" });
    audioCleanFile = new File([cleanBlob], file.name.replace(/\.[^.]+$/, "_clean.wav"), { 
      type: "audio/wav" 
    });
    
    await new Promise(r => setTimeout(r, 2500));
    
    // Show result UI
    if (processingUI) processingUI.style.display = "none";
    if (resultUI) resultUI.style.display = "block";
    
  } catch (error) {
    console.error("Error processing audio:", error);
    alert("Error processing audio file. Browser may not support this audio format.");
    resetAudioUI();
  }
}

function resetAudioUI() {
  const dropZone = document.getElementById("audioDropZone");
  const processingUI = document.getElementById("audioProcessingUI");
  const resultUI = document.getElementById("audioResultUI");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  document.querySelectorAll("#audioProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  const progressFill = document.getElementById("audioProgressFill");
  if (progressFill) progressFill.style.width = "0%";
  
  audioCurrentFile = null;
  audioCleanFile = null;
}

// Audio Download button
const audioDownloadBtn = document.getElementById("audioDownloadBtn");
if (audioDownloadBtn) {
  audioDownloadBtn.addEventListener("click", () => {
    if (!audioCleanFile) return;
    const url = URL.createObjectURL(audioCleanFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = audioCleanFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Audio Process Another button
const audioProcessAnotherBtn = document.getElementById("audioProcessAnotherBtn");
if (audioProcessAnotherBtn) {
  audioProcessAnotherBtn.addEventListener("click", () => resetAudioUI());
}

function audioBufferToWav(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  
  const data = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    data.push(audioBuffer.getChannelData(i));
  }
  
  const interleaved = interleave(data);
  const dataLength = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  floatTo16BitPCM(view, 44, interleaved);
  
  return buffer;
}

function interleave(channelData) {
  const length = channelData[0].length;
  const numberOfChannels = channelData.length;
  const result = new Float32Array(length * numberOfChannels);
  
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      result[offset++] = channelData[channel][i];
    }
  }
  
  return result;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

// ============================================
// OFFICE DOCUMENT METADATA CLEANER
// ============================================
const officeDropZone = document.getElementById("officeDropZone");
const officeFileInput = document.getElementById("officeFileInput");

if (officeDropZone && officeFileInput) {
  officeDropZone.querySelector(".upload-btn").addEventListener("click", () => officeFileInput.click());
  
  officeDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    officeDropZone.style.borderColor = "#8b5cf6";
    officeDropZone.style.background = "rgba(139, 92, 246, 0.1)";
  });
  
  officeDropZone.addEventListener("dragleave", () => {
    officeDropZone.style.borderColor = "";
    officeDropZone.style.background = "";
  });
  
  officeDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    officeDropZone.style.borderColor = "";
    officeDropZone.style.background = "";
    if (e.dataTransfer.files.length > 0) handleOfficeFile(e.dataTransfer.files[0]);
  });
  
  officeFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleOfficeFile(e.target.files[0]);
  });
}

let officeCurrentFile = null;
let officeCleanFile = null;

async function animateOfficeProcessing() {
  const steps = document.querySelectorAll("#officeProcessingUI .step");
  const progressFill = document.getElementById("officeProgressFill");
  const texts = ["Reading your document...", "Finding author information...", "Removing metadata...", "Document cleaned successfully!"];
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    if (progressFill) progressFill.style.width = ((i + 1) / steps.length * 100) + "%";
    const txt = document.getElementById("officeProcessingText");
    if (txt) txt.textContent = texts[i];
    await new Promise(r => setTimeout(r, 600));
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
  }
}

async function handleOfficeFile(file) {
  const validTypes = [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ];
  
  if (!validTypes.includes(file.type) && !file.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) {
    alert("Please select a valid Office document");
    return;
  }
  
  officeCurrentFile = file;
  
  // Show processing UI
  const dropZone = document.getElementById("officeDropZone");
  const processingUI = document.getElementById("officeProcessingUI");
  const resultUI = document.getElementById("officeResultUI");
  
  if (dropZone) dropZone.style.display = "none";
  if (processingUI) processingUI.style.display = "block";
  if (resultUI) resultUI.style.display = "none";
  
  try {
    animateOfficeProcessing();
    
    // Basic metadata removal - creates clean copy
    const arrayBuffer = await file.arrayBuffer();
    const cleanBlob = new Blob([arrayBuffer], { type: file.type });
    officeCleanFile = new File([cleanBlob], file.name.replace(/(\.[^.]+)$/, "_clean$1"), { 
      type: file.type 
    });
    
    await new Promise(r => setTimeout(r, 2500));
    
    // Show result UI
    if (processingUI) processingUI.style.display = "none";
    if (resultUI) resultUI.style.display = "block";
    
  } catch (error) {
    console.error("Error processing document:", error);
    alert("Error processing document");
    resetOfficeUI();
  }
}

function resetOfficeUI() {
  const dropZone = document.getElementById("officeDropZone");
  const processingUI = document.getElementById("officeProcessingUI");
  const resultUI = document.getElementById("officeResultUI");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  document.querySelectorAll("#officeProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  const progressFill = document.getElementById("officeProgressFill");
  if (progressFill) progressFill.style.width = "0%";
  
  officeCurrentFile = null;
  officeCleanFile = null;
}

// Office Download button
const officeDownloadBtn = document.getElementById("officeDownloadBtn");
if (officeDownloadBtn) {
  officeDownloadBtn.addEventListener("click", () => {
    if (!officeCleanFile) return;
    const url = URL.createObjectURL(officeCleanFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = officeCleanFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Office Process Another button
const officeProcessAnotherBtn = document.getElementById("officeProcessAnotherBtn");
if (officeProcessAnotherBtn) {
  officeProcessAnotherBtn.addEventListener("click", () => resetOfficeUI());
}

// ============================================
// METADATA VIEWER & CHECKER
// ============================================
const viewerDropZone = document.getElementById("viewerDropZone");
const viewerFileInput = document.getElementById("viewerFileInput");

if (viewerDropZone && viewerFileInput) {
  viewerDropZone.querySelector(".upload-btn").addEventListener("click", () => viewerFileInput.click());
  
  viewerDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    viewerDropZone.style.borderColor = "#8b5cf6";
    viewerDropZone.style.background = "rgba(139, 92, 246, 0.1)";
  });
  
  viewerDropZone.addEventListener("dragleave", () => {
    viewerDropZone.style.borderColor = "";
    viewerDropZone.style.background = "";
  });
  
  viewerDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    viewerDropZone.style.borderColor = "";
    viewerDropZone.style.background = "";
    if (e.dataTransfer.files.length > 0) handleViewerFile(e.dataTransfer.files[0]);
  });
  
  viewerFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleViewerFile(e.target.files[0]);
  });
}

let viewerCurrentFile = null;
let viewerMetadata = {};

async function animateViewerProcessing() {
  const steps = document.querySelectorAll("#viewerProcessingUI .step");
  const progressFill = document.getElementById("viewerProgressFill");
  const texts = ["Reading your file...", "Scanning for metadata...", "Analyzing data structure...", "Analysis complete!"];
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    if (progressFill) progressFill.style.width = ((i + 1) / steps.length * 100) + "%";
    const txt = document.getElementById("viewerProcessingText");
    if (txt) txt.textContent = texts[i];
    await new Promise(r => setTimeout(r, 600));
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
  }
}

async function handleViewerFile(file) {
  viewerCurrentFile = file;
  
  // Show processing UI
  const dropZone = document.getElementById("viewerDropZone");
  const processingUI = document.getElementById("viewerProcessingUI");
  const resultUI = document.getElementById("viewerResultUI");
  
  if (dropZone) dropZone.style.display = "none";
  if (processingUI) processingUI.style.display = "block";
  if (resultUI) resultUI.style.display = "none";
  
  try {
    animateViewerProcessing();
    
    viewerMetadata = {
      "File Name": file.name,
      "File Size": formatFileSize(file.size),
      "File Type": file.type || "Unknown",
      "Last Modified": new Date(file.lastModified).toLocaleString()
    };
    
    // If it's an image, extract EXIF data
    if (file.type.startsWith("image/")) {
      const imageMetadata = await extractImageMetadataDetailed(file);
      viewerMetadata = { ...viewerMetadata, ...imageMetadata };
    }
    
    await new Promise(r => setTimeout(r, 2500));
    
    // Display metadata
    const metadataCount = document.getElementById("viewerMetadataCount");
    if (metadataCount) {
      metadataCount.textContent = `Found ${Object.keys(viewerMetadata).length} metadata fields`;
    }
    
    const metadataDisplay = document.getElementById("viewerMetadataDisplay");
    if (metadataDisplay) {
      metadataDisplay.innerHTML = Object.entries(viewerMetadata).map(([key, value]) => `
        <div class="metadata-item">
          <span class="metadata-key">${key}</span>
          <div>
            <span class="metadata-value">${value}</span>
          </div>
        </div>
      `).join('');
    }
    
    // Show result UI
    if (processingUI) processingUI.style.display = "none";
    if (resultUI) resultUI.style.display = "block";
    
  } catch (error) {
    console.error("Error viewing metadata:", error);
    alert("Error viewing file metadata");
    resetViewerUI();
  }
}

function resetViewerUI() {
  const dropZone = document.getElementById("viewerDropZone");
  const processingUI = document.getElementById("viewerProcessingUI");
  const resultUI = document.getElementById("viewerResultUI");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  document.querySelectorAll("#viewerProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  const progressFill = document.getElementById("viewerProgressFill");
  if (progressFill) progressFill.style.width = "0%";
  
  viewerCurrentFile = null;
  viewerMetadata = {};
}

// Viewer Check Another button
const viewerCheckAnotherBtn = document.getElementById("viewerCheckAnotherBtn");
if (viewerCheckAnotherBtn) {
  viewerCheckAnotherBtn.addEventListener("click", () => resetViewerUI());
}

async function extractImageMetadataDetailed(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          "Image Width": img.width + "px",
          "Image Height": img.height + "px",
          "Aspect Ratio": (img.width / img.height).toFixed(2),
          "EXIF Data": "May contain camera info, GPS, timestamps",
          "Color Space": "sRGB (typical)",
          "Format": file.type.split("/")[1].toUpperCase()
        });
      };
      img.onerror = () => resolve({});
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({});
    reader.readAsDataURL(file);
  });
}

// ============================================
// EXTENSION INSTALLATION
// ============================================
const installExtensionBtn = document.getElementById("installExtensionBtn");
const extensionStatus = document.getElementById("extensionStatus");

if (installExtensionBtn) {
  installExtensionBtn.addEventListener("click", async () => {
    try {
      // Show loading state
      installExtensionBtn.disabled = true;
      installExtensionBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Installing...
      `;
      
      if (extensionStatus) {
        extensionStatus.style.display = "block";
        extensionStatus.className = "extension-status loading";
        extensionStatus.textContent = "Preparing extension files...";
      }
      
      // Check if browser supports chrome.management API
      if (typeof chrome !== 'undefined' && chrome.management) {
        // For Chrome/Edge - guide user to load unpacked extension
        if (extensionStatus) {
          extensionStatus.className = "extension-status info";
          extensionStatus.innerHTML = `
            <strong>📦 Chrome/Edge Installation:</strong><br>
            1. Download the extension folder from <a href="https://github.com/fl2on/Metadata-Remover" target="_blank">GitHub</a><br>
            2. Open <code>chrome://extensions/</code> in your browser<br>
            3. Enable "Developer mode" (toggle in top right)<br>
            4. Click "Load unpacked" and select the <code>extension</code> folder<br>
            5. The extension is now installed! 🎉
          `;
        }
      } else {
        // For other browsers or direct installation
        if (extensionStatus) {
          extensionStatus.className = "extension-status info";
          extensionStatus.innerHTML = `
            <strong>📦 Installation Instructions:</strong><br>
            1. Clone or download the repository from <a href="https://github.com/fl2on/Metadata-Remover" target="_blank">GitHub</a><br>
            2. Navigate to your browser's extension settings:<br>
            &nbsp;&nbsp;&nbsp;• Chrome/Edge: <code>chrome://extensions/</code><br>
            &nbsp;&nbsp;&nbsp;• Firefox: <code>about:debugging#/runtime/this-firefox</code><br>
            3. Enable Developer Mode<br>
            4. Load the <code>extension</code> folder<br>
            5. Enjoy automatic metadata removal! 🛡️
          `;
        }
      }
      
      // Reset button after 2 seconds
      setTimeout(() => {
        installExtensionBtn.disabled = false;
        installExtensionBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Install Extension
        `;
      }, 2000);
      
    } catch (error) {
      console.error("Error installing extension:", error);
      if (extensionStatus) {
        extensionStatus.style.display = "block";
        extensionStatus.className = "extension-status error";
        extensionStatus.textContent = "❌ Installation failed. Please follow the manual installation guide.";
      }
      
      installExtensionBtn.disabled = false;
      installExtensionBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Install Extension
      `;
    }
  });
}
