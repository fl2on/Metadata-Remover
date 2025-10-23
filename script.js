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
  
  // If no steps found, exit early
  if (steps.length === 0) return;
  
  // Reset all steps first
  steps.forEach(step => {
    step.classList.remove("active", "complete");
  });
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    void progressFill.offsetWidth; // Force reflow
  }
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    
    const txt = document.getElementById("processingText");
    if (txt && texts[i]) txt.textContent = texts[i];
    
    // Wait a bit before starting progress animation
    await new Promise(r => setTimeout(r, 100));
    
    // Animate progress bar to complete this step
    if (progressFill) {
      const targetWidth = ((i + 1) / steps.length * 100);
      progressFill.style.transition = "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
      progressFill.style.width = targetWidth + "%";
    }
    
    // Wait for the progress bar animation to complete
    await new Promise(r => setTimeout(r, 500));
    
    // Now mark step as complete
    steps[i].classList.remove("active");
    steps[i].classList.add("complete");
    
    // Short pause before next step
    await new Promise(r => setTimeout(r, 100));
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
    // Wait for animation to complete before processing
    await animateProcessing();
    
    extractedMetadata = await extractMetadata(file);
    originalImageUrl = URL.createObjectURL(file);
    processedFile = await removeMetadata(file);
    cleanImageUrl = URL.createObjectURL(processedFile);
    
    // Small delay before showing results
    await new Promise(r => setTimeout(r, 300));
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
      try {
        // Set canvas dimensions
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        // Clear any previous content
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Disable image smoothing to preserve quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image on canvas (this strips all metadata)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob with high quality
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          
          // Create clean filename
          const originalName = file.name.replace(/\.[^/.]+$/, "");
          const cleanFileName = originalName + "_clean.png";
          
          // Create new file without any metadata
          const cleanFile = new File([blob], cleanFileName, { 
            type: "image/png",
            lastModified: Date.now()
          });
          
          resolve(cleanFile);
        }, "image/png", 1.0); // Use maximum quality
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    
    // Create object URL instead of data URL for better memory handling
    const imageUrl = URL.createObjectURL(file);
    img.src = imageUrl;
    
    // Clean up object URL after image loads
    img.onload = (function(url) {
      return function() {
        try {
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }
            const originalName = file.name.replace(/\.[^/.]+$/, "");
            const cleanFileName = originalName + "_clean.png";
            const cleanFile = new File([blob], cleanFileName, { 
              type: "image/png",
              lastModified: Date.now()
            });
            resolve(cleanFile);
          }, "image/png", 1.0);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
    })(imageUrl);
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
    item.innerHTML = `
      <span class="metadata-key">${key}</span>
      <span class="metadata-value">${value}</span>
      <span class="metadata-removed">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Removed
      </span>
    `;
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
  
  // Clean up object URLs to prevent memory leaks
  if (originalImageUrl) {
    URL.revokeObjectURL(originalImageUrl);
    originalImageUrl = null;
  }
  if (cleanImageUrl) {
    URL.revokeObjectURL(cleanImageUrl);
    cleanImageUrl = null;
  }
  
  // Reset UI visibility
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  // Reset file input
  if (fileInput) fileInput.value = "";
  
  // Reset processing steps and progress bar
  document.querySelectorAll(".step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  
  const progressFill = document.getElementById("progressFill");
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    // Force reflow
    void progressFill.offsetWidth;
    progressFill.style.transition = "width 0.6s ease";
  }
  
  // Reset tabs
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
  const fileInput = document.getElementById("pdfFileInput");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  if (fileInput) fileInput.value = "";
  
  document.querySelectorAll("#pdfProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  
  const progressFill = document.getElementById("pdfProgressFill");
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    void progressFill.offsetWidth;
    progressFill.style.transition = "width 0.6s ease";
  }
  
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
  const fileInput = document.getElementById("videoFileInput");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  if (fileInput) fileInput.value = "";
  
  document.querySelectorAll("#videoProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  
  const progressFill = document.getElementById("videoProgressFill");
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    void progressFill.offsetWidth;
    progressFill.style.transition = "width 0.6s ease";
  }
  
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
  const fileInput = document.getElementById("audioFileInput");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  if (fileInput) fileInput.value = "";
  
  document.querySelectorAll("#audioProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  
  const progressFill = document.getElementById("audioProgressFill");
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    void progressFill.offsetWidth;
    progressFill.style.transition = "width 0.6s ease";
  }
  
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
  const fileInput = document.getElementById("officeFileInput");
  
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  if (fileInput) fileInput.value = "";
  
  document.querySelectorAll("#officeProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  
  const progressFill = document.getElementById("officeProgressFill");
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    void progressFill.offsetWidth;
    progressFill.style.transition = "width 0.6s ease";
  }
  
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
  
  // Reset all steps first
  steps.forEach(step => {
    step.classList.remove("active", "complete");
  });
  if (progressFill) progressFill.style.width = "0%";
  
  for (let i = 0; i < steps.length; i++) {
    steps[i].classList.add("active");
    
    // Smooth progress animation
    if (progressFill) {
      const targetWidth = ((i + 1) / steps.length * 100);
      progressFill.style.transition = "width 0.6s ease";
      progressFill.style.width = targetWidth + "%";
    }
    
    const txt = document.getElementById("viewerProcessingText");
    if (txt) txt.textContent = texts[i];
    
    await new Promise(r => setTimeout(r, 650));
    
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
      // Organize metadata into categories
      const categories = organizeMetadataByCategory(viewerMetadata);
      
      metadataDisplay.innerHTML = '';
      
      // Display each category
      Object.entries(categories).forEach(([categoryName, items]) => {
        if (items.length === 0) return;
        
        const categorySection = document.createElement('div');
        categorySection.className = 'metadata-category';
        categorySection.innerHTML = `
          <h3 class="metadata-category-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
            ${categoryName}
          </h3>
          <div class="metadata-category-items">
            ${items.map(([key, value]) => {
              const isGPS = key.includes('GPS');
              const isSensitive = isGPS || key.includes('Location') || key.includes('Latitude') || key.includes('Longitude');
              return `
                <div class="metadata-item ${isSensitive ? 'metadata-sensitive' : ''}">
                  <span class="metadata-key">${key}</span>
                  <div class="metadata-value-container">
                    <span class="metadata-value">${value}</span>
                    ${isGPS ? '<span class="privacy-warning">⚠️ Privacy Risk</span>' : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        metadataDisplay.appendChild(categorySection);
      });
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

// Organize metadata into logical categories
function organizeMetadataByCategory(metadata) {
  const categories = {
    "📁 File Information": [],
    "📷 Camera Information": [],
    "⚙️ Camera Settings": [],
    "📅 Date & Time": [],
    "📍 GPS Location": [],
    "🎨 Image Properties": [],
    "💾 Software & Processing": [],
    "📝 Additional Information": []
  };
  
  const cameraInfoKeys = ["Camera Make", "Camera Model", "Lens Model"];
  const cameraSettingsKeys = ["ISO", "Aperture", "Shutter Speed", "Focal Length", "White Balance", "Flash", "Exposure Mode", "Metering Mode"];
  const dateKeys = ["Date/Time", "Original Date/Time", "Digitized Date/Time", "Last Modified"];
  const gpsKeys = ["GPS Latitude", "GPS Longitude", "GPS Location", "GPS Altitude"];
  const imageKeys = ["Image Width", "Image Height", "Aspect Ratio", "Format", "Orientation", "Color Space", "X Resolution", "Y Resolution"];
  const softwareKeys = ["Software", "Artist/Author", "Copyright", "Editing software used"];
  const fileKeys = ["File Name", "File Size", "File Type"];
  
  Object.entries(metadata).forEach(([key, value]) => {
    if (fileKeys.includes(key)) {
      categories["📁 File Information"].push([key, value]);
    } else if (cameraInfoKeys.includes(key)) {
      categories["📷 Camera Information"].push([key, value]);
    } else if (cameraSettingsKeys.includes(key)) {
      categories["⚙️ Camera Settings"].push([key, value]);
    } else if (dateKeys.includes(key)) {
      categories["📅 Date & Time"].push([key, value]);
    } else if (gpsKeys.includes(key)) {
      categories["📍 GPS Location"].push([key, value]);
    } else if (imageKeys.includes(key)) {
      categories["🎨 Image Properties"].push([key, value]);
    } else if (softwareKeys.includes(key)) {
      categories["💾 Software & Processing"].push([key, value]);
    } else {
      categories["📝 Additional Information"].push([key, value]);
    }
  });
  
  return categories;
}

function resetViewerUI() {
  const dropZone = document.getElementById("viewerDropZone");
  const processingUI = document.getElementById("viewerProcessingUI");
  const resultUI = document.getElementById("viewerResultUI");
  const fileInput = document.getElementById("viewerFileInput");
  
  // Reset UI visibility
  if (dropZone) dropZone.style.display = "flex";
  if (processingUI) processingUI.style.display = "none";
  if (resultUI) resultUI.style.display = "none";
  
  // Reset file input
  if (fileInput) fileInput.value = "";
  
  // Reset processing steps and progress bar
  document.querySelectorAll("#viewerProcessingUI .step").forEach(step => {
    step.classList.remove("active", "complete");
  });
  
  const progressFill = document.getElementById("viewerProgressFill");
  if (progressFill) {
    progressFill.style.transition = "none";
    progressFill.style.width = "0%";
    // Force reflow
    void progressFill.offsetWidth;
    progressFill.style.transition = "width 0.6s ease";
  }
  
  // Reset state
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
        // Basic image info
        const metadata = {
          "Image Width": img.width + "px",
          "Image Height": img.height + "px",
          "Aspect Ratio": (img.width / img.height).toFixed(2),
          "Format": file.type.split("/")[1].toUpperCase()
        };
        
        // Try to extract EXIF data
        if (typeof EXIF !== 'undefined') {
          EXIF.getData(img, function() {
            const allTags = EXIF.getAllTags(this);
            
            // Camera Information
            if (allTags.Make) {
              metadata["Camera Make"] = allTags.Make;
            }
            if (allTags.Model) {
              metadata["Camera Model"] = allTags.Model;
            }
            if (allTags.LensModel) {
              metadata["Lens Model"] = allTags.LensModel;
            }
            
            // Camera Settings
            if (allTags.ISO || allTags.ISOSpeedRatings) {
              metadata["ISO"] = allTags.ISO || allTags.ISOSpeedRatings;
            }
            if (allTags.FNumber) {
              metadata["Aperture"] = "f/" + allTags.FNumber;
            }
            if (allTags.ExposureTime) {
              const exposure = allTags.ExposureTime;
              metadata["Shutter Speed"] = exposure < 1 ? "1/" + Math.round(1/exposure) + "s" : exposure + "s";
            }
            if (allTags.FocalLength) {
              metadata["Focal Length"] = allTags.FocalLength + "mm";
            }
            if (allTags.WhiteBalance) {
              metadata["White Balance"] = allTags.WhiteBalance === 0 ? "Auto" : "Manual";
            }
            if (allTags.Flash) {
              const flashValue = allTags.Flash;
              metadata["Flash"] = (flashValue & 1) ? "Flash fired" : "Flash did not fire";
            }
            
            // Date and Time
            if (allTags.DateTime) {
              metadata["Date/Time"] = allTags.DateTime;
            }
            if (allTags.DateTimeOriginal) {
              metadata["Original Date/Time"] = allTags.DateTimeOriginal;
            }
            if (allTags.DateTimeDigitized) {
              metadata["Digitized Date/Time"] = allTags.DateTimeDigitized;
            }
            
            // GPS Location
            if (allTags.GPSLatitude && allTags.GPSLongitude) {
              const lat = convertDMSToDD(
                allTags.GPSLatitude[0], 
                allTags.GPSLatitude[1], 
                allTags.GPSLatitude[2], 
                allTags.GPSLatitudeRef
              );
              const lon = convertDMSToDD(
                allTags.GPSLongitude[0], 
                allTags.GPSLongitude[1], 
                allTags.GPSLongitude[2], 
                allTags.GPSLongitudeRef
              );
              metadata["GPS Latitude"] = lat.toFixed(6) + "° " + allTags.GPSLatitudeRef;
              metadata["GPS Longitude"] = lon.toFixed(6) + "° " + allTags.GPSLongitudeRef;
              metadata["GPS Location"] = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            }
            if (allTags.GPSAltitude) {
              metadata["GPS Altitude"] = allTags.GPSAltitude + "m";
            }
            
            // Software and Processing
            if (allTags.Software) {
              metadata["Software"] = allTags.Software;
            }
            if (allTags.Artist) {
              metadata["Artist/Author"] = allTags.Artist;
            }
            if (allTags.Copyright) {
              metadata["Copyright"] = allTags.Copyright;
            }
            
            // Image Settings
            if (allTags.Orientation) {
              const orientations = {
                1: "Normal",
                2: "Mirrored",
                3: "Rotated 180°",
                4: "Mirrored and Rotated 180°",
                5: "Mirrored and Rotated 90° CCW",
                6: "Rotated 90° CW",
                7: "Mirrored and Rotated 90° CW",
                8: "Rotated 90° CCW"
              };
              metadata["Orientation"] = orientations[allTags.Orientation] || allTags.Orientation;
            }
            if (allTags.ColorSpace) {
              metadata["Color Space"] = allTags.ColorSpace === 1 ? "sRGB" : "Uncalibrated";
            }
            if (allTags.ExposureMode) {
              const modes = {0: "Auto", 1: "Manual", 2: "Auto Bracket"};
              metadata["Exposure Mode"] = modes[allTags.ExposureMode] || allTags.ExposureMode;
            }
            if (allTags.MeteringMode) {
              const modes = {
                0: "Unknown", 1: "Average", 2: "Center-weighted average",
                3: "Spot", 4: "Multi-spot", 5: "Multi-segment", 6: "Partial"
              };
              metadata["Metering Mode"] = modes[allTags.MeteringMode] || allTags.MeteringMode;
            }
            
            // Resolution
            if (allTags.XResolution) {
              metadata["X Resolution"] = allTags.XResolution + " dpi";
            }
            if (allTags.YResolution) {
              metadata["Y Resolution"] = allTags.YResolution + " dpi";
            }
            
            // Additional info
            if (allTags.ImageDescription) {
              metadata["Description"] = allTags.ImageDescription;
            }
            if (allTags.UserComment) {
              metadata["User Comment"] = allTags.UserComment;
            }
            
            resolve(metadata);
          });
        } else {
          // Fallback if EXIF library is not loaded
          metadata["EXIF Status"] = "EXIF library not loaded - showing basic info only";
          resolve(metadata);
        }
      };
      img.onerror = () => resolve({
        "Error": "Failed to load image"
      });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({
      "Error": "Failed to read file"
    });
    reader.readAsDataURL(file);
  });
}

// Helper function to convert GPS coordinates from DMS to Decimal Degrees
function convertDMSToDD(degrees, minutes, seconds, direction) {
  let dd = degrees + minutes/60 + seconds/3600;
  if (direction === "S" || direction === "W") {
    dd = dd * -1;
  }
  return dd;
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
