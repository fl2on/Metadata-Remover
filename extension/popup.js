// POPUP SCRIPT
let processedFiles = [];
let totalProcessedToday = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const uploadSection = document.getElementById('uploadSection');
    const processingSection = document.getElementById('processingSection');
    const resultsSection = document.getElementById('resultsSection');
    const downloadBtn = document.getElementById('downloadBtn');
    const newUploadBtn = document.getElementById('newUploadBtn');
    const notificationToggle = document.getElementById('notificationToggle');
    const processedCount = document.getElementById('processedCount');
    const uploadBtn = dropZone.querySelector('.upload-btn');
    
    // Load settings
    chrome.storage.sync.get(['showNotifications', 'totalProcessed'], (result) => {
        if (notificationToggle) notificationToggle.checked = result.showNotifications !== false;
        totalProcessedToday = result.totalProcessed || 0;
        if (processedCount) processedCount.textContent = totalProcessedToday;
    });
    
    // Upload button click
    uploadBtn.addEventListener('click', () => fileInput.click());
    
    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragging');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragging');
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragging');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) await processImages(files);
    });
    
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) await processImages(files);
    });
    
    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadAllCleanImages());
    if (newUploadBtn) newUploadBtn.addEventListener('click', () => resetUI());
    
    if (notificationToggle) {
        notificationToggle.addEventListener('change', () => {
            chrome.storage.sync.set({ showNotifications: notificationToggle.checked });
        });
    }
    
    async function processImages(files) {
        processedFiles = [];
        uploadSection.style.display = 'none';
        resultsSection.style.display = 'none';
        processingSection.style.display = 'block';
        
        const processingText = document.getElementById('processingText');
        processingText.textContent = `Processing ${files.length} image${files.length > 1 ? 's' : ''}...`;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                processingText.textContent = `Processing ${i + 1}/${files.length}...`;
                const cleanFile = await removeMetadata(file);
                processedFiles.push(cleanFile);
                totalProcessedToday++;
            }
            
            chrome.storage.sync.set({ totalProcessed: totalProcessedToday });
            processedCount.textContent = totalProcessedToday;
            
            processingSection.style.display = 'none';
            resultsSection.style.display = 'block';
            
            const resultsText = document.getElementById('resultsText');
            resultsText.textContent = `${files.length} image${files.length > 1 ? 's' : ''} cleaned successfully!`;
        } catch (error) {
            console.error('Error processing images:', error);
            resetUI();
        }
    }
    
    async function removeMetadata(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const cleanFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '_clean.png', { type: 'image/png' });
                    resolve(cleanFile);
                }, 'image/png', 0.95);
            };
            
            img.onerror = reject;
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    function downloadAllCleanImages() {
        processedFiles.forEach((file, index) => {
            setTimeout(() => {
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, index * 100);
        });
    }
    
    function resetUI() {
        processedFiles = [];
        fileInput.value = '';
        uploadSection.style.display = 'block';
        processingSection.style.display = 'none';
        resultsSection.style.display = 'none';
    }
});
