// Metadata Remover

let isEnabled = true;
let filesProcessed = 0;

// Cargar estado de activación
chrome.storage.sync.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
});

// Escuchar cambios de configuración
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue;
  }
});

// Función principal para eliminar metadatos usando Canvas
async function removeMetadata(file) {
  if (!file.type.startsWith('image/')) {
    return file; // Solo procesar imágenes por ahora
  }

  try {
    showProcessingNotification();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Leer el archivo como Data URL
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    
    // Esperar a que la imagen cargue
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    
    // Dibujar imagen en canvas (esto elimina EXIF y otros metadatos)
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // Convertir canvas a Blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, file.type, 0.95);
    });
    
    // Crear nuevo archivo limpio con el mismo nombre
    const cleanFile = new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now()
    });
    
    filesProcessed++;
    updateBadge();
    showSuccessNotification(file.name);
    
    return cleanFile;
    
  } catch (error) {
    console.error('Error removing metadata:', error);
    showErrorNotification(file.name);
    return file; // Retornar archivo original si falla
  }
}

// Interceptar inputs de tipo file
function interceptFileInput(input) {
  if (input._metadataRemoverPatched) return;
  input._metadataRemoverPatched = true;
  
  const originalAddEventListener = input.addEventListener.bind(input);
  
  input.addEventListener = function(type, listener, options) {
    if (type === 'change' && isEnabled) {
      const wrappedListener = async function(e) {
        if (input.files && input.files.length > 0) {
          const cleanFiles = await Promise.all(
            Array.from(input.files).map(file => removeMetadata(file))
          );
          
          // Crear nuevo FileList
          const dataTransfer = new DataTransfer();
          cleanFiles.forEach(file => dataTransfer.items.add(file));
          
          // Reemplazar archivos
          Object.defineProperty(input, 'files', {
            value: dataTransfer.files,
            writable: false
          });
        }
        
        // Llamar al listener original
        listener.call(this, e);
      };
      
      originalAddEventListener('change', wrappedListener, options);
    } else {
      originalAddEventListener(type, listener, options);
    }
  };
  
  // También interceptar el evento change directamente
  const originalOnChange = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'onchange'
  );
  
  if (originalOnChange) {
    Object.defineProperty(input, 'onchange', {
      get() { return originalOnChange.get.call(this); },
      set(handler) {
        const wrappedHandler = async function(e) {
          if (isEnabled && this.files && this.files.length > 0) {
            const cleanFiles = await Promise.all(
              Array.from(this.files).map(file => removeMetadata(file))
            );
            
            const dataTransfer = new DataTransfer();
            cleanFiles.forEach(file => dataTransfer.items.add(file));
            
            Object.defineProperty(this, 'files', {
              value: dataTransfer.files,
              writable: false
            });
          }
          
          if (handler) handler.call(this, e);
        };
        
        originalOnChange.set.call(this, wrappedHandler);
      }
    });
  }
}

// Interceptar drag & drop
function interceptDragAndDrop(element) {
  if (element._metadataRemoverDragPatched) return;
  element._metadataRemoverDragPatched = true;
  
  element.addEventListener('drop', async (e) => {
    if (!isEnabled) return;
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const cleanFiles = await Promise.all(
      Array.from(files).map(file => removeMetadata(file))
    );
    
    // Crear nuevo evento con archivos limpios
    const dataTransfer = new DataTransfer();
    cleanFiles.forEach(file => dataTransfer.items.add(file));
    
    const newEvent = new DragEvent('drop', {
      bubbles: e.bubbles,
      cancelable: e.cancelable,
      composed: e.composed,
      dataTransfer: dataTransfer
    });
    
    Object.defineProperty(newEvent, 'target', { value: e.target, writable: false });
    
    // Despachar nuevo evento
    setTimeout(() => element.dispatchEvent(newEvent), 10);
    
  }, true);
}

// Observar cambios en el DOM para interceptar elementos dinámicos
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        // Buscar inputs de archivo
        if (node.tagName === 'INPUT' && node.type === 'file') {
          interceptFileInput(node);
        }
        
        // Buscar en descendientes
        const fileInputs = node.querySelectorAll?.('input[type="file"]');
        fileInputs?.forEach(interceptFileInput);
        
        // Interceptar zonas de drop comunes
        if (node.classList?.contains('dropzone') || 
            node.hasAttribute?.('data-dropzone') ||
            node.ondrop) {
          interceptDragAndDrop(node);
        }
      }
    });
  });
});

// Inicializar
function init() {
  // Interceptar inputs de archivo existentes
  document.querySelectorAll('input[type="file"]').forEach(interceptFileInput);
  
  // Interceptar zonas de drop comunes
  const dropzones = document.querySelectorAll(
    '.dropzone, [data-dropzone], [ondrop]'
  );
  dropzones.forEach(interceptDragAndDrop);
  
  // Observar cambios en el DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('🛡️ Metadata Remover active - All uploads protected');
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Notificaciones visuales
function showProcessingNotification() {
  const notification = createNotification('🔄 Procesando...', '#3b82f6');
  setTimeout(() => notification.remove(), 1500);
}

function showSuccessNotification(filename) {
  const notification = createNotification(
    `✅ Metadatos eliminados: ${filename}`,
    '#10b981'
  );
  setTimeout(() => notification.remove(), 3000);
}

function showErrorNotification(filename) {
  const notification = createNotification(
    `⚠️ Error procesando: ${filename}`,
    '#ef4444'
  );
  setTimeout(() => notification.remove(), 3000);
}

function createNotification(message, color) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 2147483647;
    animation: slideIn 0.3s ease-out;
    backdrop-filter: blur(10px);
  `;
  
  notification.textContent = message;
  
  // Agregar estilos de animación si no existen
  if (!document.getElementById('metadata-remover-styles')) {
    const style = document.createElement('style');
    style.id = 'metadata-remover-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  return notification;
}

// Actualizar badge del ícono
function updateBadge() {
  chrome.runtime.sendMessage({
    type: 'updateBadge',
    count: filesProcessed
  });
}