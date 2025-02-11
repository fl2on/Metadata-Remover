const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const preview = document.getElementById('preview');
const uploadUI = document.getElementById('uploadUI');
const previewUI = document.getElementById('previewUI');
const yearSpan = document.getElementById('year');
const metadataDisplay = document.getElementById('metadataDisplay');
const metadataContent = document.getElementById('metadataContent');
const formatSelector = document.getElementById('format');
const progressContainer = document.getElementById('progress-container');
const progressBar = progressContainer.querySelector('.progress');
const progressText = progressContainer.querySelector('.progress-text');

let currentFiles = []; // Array to handle multiple files
let processedImageData = null; // To store processed image data

// Set current year in footer
yearSpan.textContent = new Date().getFullYear();

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragging');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragging');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragging');

    const files = Array.from(e.dataTransfer.files); // Get files as array
    handleFiles(files);
});

fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files); // Get files as array
    handleFiles(files);
});

function handleFiles(files) {
    currentFiles = files.filter(file => file.type.startsWith('image/')); // Filter only image files

    if (currentFiles.length > 0) {
        // For now, just process the first image, you can extend to handle multiple previews
        const file = currentFiles[0];
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            preview.src = canvas.toDataURL();
            uploadUI.classList.add('hidden');
            previewUI.classList.remove('hidden');
            dropZone.classList.add('has-preview');
            metadataDisplay.classList.remove('hidden'); // Show metadata display

            // Extract and display basic metadata (can be expanded with libraries for detailed metadata)
            displayMetadata(file);
        };
    }
}


function displayMetadata(file) {
    // Basic metadata display - you might want to use a library like 'exif-js' for more detailed info
    const metadata = {
        'File Name': file.name,
        'File Type': file.type,
        'File Size': formatFileSize(file.size),
        'Last Modified': file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'N/A'
    };

    let metadataText = '';
    for (const key in metadata) {
        metadataText += `${key}: ${metadata[key]}\n`;
    }
    metadataContent.textContent = metadataText;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
}


async function downloadImage() {
    if (!processedImageData && canvas.toDataURL() === preview.src) {
        // Start processing: Show progress bar and disable buttons
        startProcessing();

        await simulateMetadataRemoval();

        // Get processed image data (for now, just re-use canvas data)
        processedImageData = canvas.toDataURL(getImageTypeForFormat(formatSelector.value));

        // End processing: Hide progress bar and enable buttons
        endProcessing();
    }

    const link = document.createElement('a');
    link.href = processedImageData || canvas.toDataURL(getImageTypeForFormat(formatSelector.value)); // Use processed data if available, else current canvas
    link.download = currentFiles[0].name.replace(/\.[^/.]+$/, "") + "-no-metadata." + formatSelector.value;
    link.click();

    // Reset processed data after download for next image
    processedImageData = null;
}

function getImageTypeForFormat(format) {
    switch (format) {
        case 'jpeg': return 'image/jpeg';
        case 'webp': return 'image/webp';
        default:     return 'image/png'; // Default to PNG
    }
}


function clearImage() {
    preview.src = '';
    fileInput.value = '';
    currentFiles = [];
    processedImageData = null; // Clear processed image data
    uploadUI.classList.remove('hidden');
    previewUI.classList.add('hidden');
    dropZone.classList.remove('has-preview');
    metadataDisplay.classList.add('hidden'); // Hide metadata display
    metadataContent.textContent = ''; // Clear metadata text
    resetProgressBar(); // Reset progress bar to 0
}

function startProcessing() {
    previewUI.querySelectorAll('button').forEach(button => button.disabled = true); // Disable buttons
    progressContainer.classList.remove('hidden'); // Show progress container
    resetProgressBar();
    animateProgressBar(80); // Start animation to 80% to simulate processing
}

function endProcessing() {
    previewUI.querySelectorAll('button').forEach(button => button.disabled = false); // Enable buttons
    progressContainer.classList.add('hidden'); // Hide progress container
    setProgress(100); // Ensure progress bar is at 100% briefly
    setTimeout(resetProgressBar, 500); // Reset progress bar after a delay
}

function simulateMetadataRemoval() {
    return new Promise(resolve => setTimeout(resolve, 1500)); // Simulate 1.5 seconds of processing
}


function resetProgressBar() {
    setProgress(0);
    progressText.textContent = 'Processing...'; // Reset text
}

function setProgress(percentage) {
    progressBar.style.width = `${percentage}%`;
}

function animateProgressBar(percentage) {
    let progressValue = 0;
    const animationDuration = 1500; // Match simulateMetadataRemoval time
    const startTime = performance.now();

    function updateProgress(currentTime) {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / animationDuration, 1); // Ensure progress doesn't exceed 1
        progressValue = progress * percentage;
        setProgress(progressValue);

        if (progress < 1) {
            requestAnimationFrame(updateProgress); // Continue animation
        } else {
            progressText.textContent = 'Processing Complete!'; // Change text when done
        }
    }

    requestAnimationFrame(updateProgress); // Start animation loop
}