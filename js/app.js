// App Coordinator & Router
const App = {
  routes: {
    '#dashboard': DashboardView,
    '#clients': ClientsView,
    '#orders': OrdersView,
    '#inventory': InventoryView
  },

  init: async () => {
    // 1. Initialize IndexedDB database
    try {
      await db.open();
      console.log('Database DazaDB initialized successfully.');
    } catch (err) {
      console.error('Failed to open database:', err);
      alert('Error crítico: ' + (err.message || err.name || err) + '\nNo se pudo abrir la base de datos local del navegador. Verifique los permisos de almacenamiento.');
    }

    // 2. Register Service Worker for PWA Offline functionality
    App.registerServiceWorker();

    // 3. Router setup
    window.addEventListener('hashchange', App.router);
    // Initial routing
    if (!window.location.hash) {
      window.location.hash = '#dashboard';
    } else {
      App.router();
    }

    // 4. Render installation banner check
    App.checkInstallationBanner();
  },

  router: async () => {
    const hash = window.location.hash.split('?')[0] || '#dashboard';
    const view = App.routes[hash] || DashboardView;

    // Highlight Navbar Active item
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const activeLink = document.getElementById(`nav-${hash.replace('#', '')}`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Render active view in main container
    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
      try {
        viewContainer.innerHTML = await view.render();
        // Initialize event listeners for the rendered view
        if (view.initListeners) {
          view.initListeners();
        }
      } catch (error) {
        console.error('Error rendering view:', error);
        viewContainer.innerHTML = `
          <div style="text-align:center; padding:50px; color:var(--danger);">
            <h2>Ocurrió un error al cargar esta pantalla</h2>
            <p>${error.message}</p>
            <button class="btn btn-secondary" onclick="window.location.reload()" style="margin-top:15px;">
              Recargar Aplicación
            </button>
          </div>
        `;
      }
    }
  },

  registerServiceWorker: () => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
          .catch(err => console.warn('Service Worker no se pudo registrar:', err));
      });
    }
  },

  checkInstallationBanner: () => {
    // Detect if running inside browser or as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    // Check if user is on mobile (iOS/Android)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && !isStandalone) {
      // Create and show PWA Prompt banner
      const banner = document.createElement('div');
      banner.className = 'main-content';
      banner.style.paddingBottom = '0';
      banner.innerHTML = `
        <div class="pwa-prompt" id="pwa-install-banner">
          <div class="pwa-prompt-text">
            <strong>🔧 ¡Instala DAZA en tu iPhone/Android!</strong>
            <br>
            Añade esta app a tu pantalla de inicio para usarla 100% offline y sin internet en el taller.
          </div>
          <button class="btn btn-primary" id="btn-pwa-dismiss" style="font-size: 11px; padding: 6px 12px; margin-left: 10px;">
            Entendido
          </button>
        </div>
      `;
      
      const appDiv = document.getElementById('app');
      appDiv.insertBefore(banner, appDiv.firstChild);

      document.getElementById('btn-pwa-dismiss').addEventListener('click', () => {
        banner.remove();
      });
    }
  }
};

// Start the Application when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
