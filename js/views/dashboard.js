const DashboardView = {
  render: async () => {
    // Fetch data from DB
    const orders = await db.getOrdersForDashboard();
    const inventory = await db.getAll('inventory');
    const clients = await db.getAll('clients');

    // Calculate metrics
    const activeOrders = orders.filter(o => o.status !== 'done');
    const readyOrders = orders.filter(o => o.status === 'ready');
    const lowStockItems = inventory.filter(i => Number(i.quantity) <= Number(i.minStockAlert));
    
    // Calculate monthly earnings
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyEarnings = orders
      .filter(o => {
        const orderDate = new Date(o.updatedAt || o.createdAt);
        return o.status === 'done' && 
               orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return `
      <div class="header-row">
        <div>
          <h1 class="page-title">Panel de Control</h1>
          <p class="page-subtitle">DAZA - Taller Mecánico (Bolivia)</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-export-backup" title="Exportar Copia de Seguridad">
            Exportar Backup
          </button>
          <button class="btn btn-secondary" id="btn-import-backup" title="Importar Copia de Seguridad">
            Importar Backup
          </button>
          <input type="file" id="file-import-db" style="display: none;" accept=".json">
        </div>
      </div>

      <!-- Métricas -->
      <div class="grid-cols-4" style="margin-bottom: 25px;">
        <div class="stat-box">
          <div class="stat-lbl">Ingresos Mes (Bs.)</div>
          <div class="stat-val" style="color: var(--success);">${monthlyEarnings.toFixed(2)}</div>
        </div>
        <div class="stat-box">
          <div class="stat-lbl">Órdenes Activas</div>
          <div class="stat-val">${activeOrders.length}</div>
        </div>
        <div class="stat-box">
          <div class="stat-lbl">Listos para Entrega</div>
          <div class="stat-val" style="color: var(--info);">${readyOrders.length}</div>
        </div>
        <div class="stat-box">
          <div class="stat-lbl">Stock Crítico</div>
          <div class="stat-val" style="color: ${lowStockItems.length > 0 ? 'var(--danger)' : 'var(--text-muted)'};">
            ${lowStockItems.length}
          </div>
        </div>
      </div>

      <!-- Buscador Rápido -->
      <div class="card" style="margin-bottom: 25px;">
        <h3 class="card-title">Buscador Rápido por Placa</h3>
        <div class="search-container">
          <input type="text" id="quick-search-plate" class="search-input" placeholder="Ingrese Placa del vehículo (Ej: 1234ABC)..." style="text-transform: uppercase;">
          <button class="btn btn-primary" id="btn-quick-search">Buscar</button>
        </div>
        <div id="quick-search-result" style="margin-top: 15px; display: none;"></div>
      </div>

      <!-- Órdenes de Trabajo Recientes / Activas -->
      <div class="card">
        <h3 class="card-title">Órdenes Activas en el Taller</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>OT #</th>
                <th>Cliente</th>
                <th>Vehículo / Placa</th>
                <th>Estado</th>
                <th>Total (Bs.)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${activeOrders.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    No hay órdenes de trabajo activas en este momento.
                  </td>
                </tr>
              ` : activeOrders.slice(0, 8).map(order => `
                <tr>
                  <td><strong>${order.id}</strong></td>
                  <td>${order.client.name}</td>
                  <td>
                    ${order.vehicle.brand} ${order.vehicle.model}
                    <br><span style="font-size: 11px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: var(--accent);">${order.vehicle.plate}</span>
                  </td>
                  <td><span class="badge badge-${order.status}">${DashboardView.getStatusLabel(order.status)}</span></td>
                  <td>Bs. ${(Number(order.totalAmount) || 0).toFixed(2)}</td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="location.hash = '#orders?edit=${order.id}'" style="padding: 5px 10px; font-size: 12px;">
                      Gestionar
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  getStatusLabel: (status) => {
    const labels = {
      draft: 'Presupuesto',
      diagnosis: 'En Diagnóstico',
      parts: 'Espera Repuestos',
      progress: 'En Progreso',
      ready: 'Listo',
      done: 'Entregado'
    };
    return labels[status] || status;
  },

  initListeners: () => {
    // Quick Search Plate
    const searchInput = document.getElementById('quick-search-plate');
    const searchBtn = document.getElementById('btn-quick-search');
    const resultDiv = document.getElementById('quick-search-result');

    const handleSearch = async () => {
      const plate = searchInput.value.trim().toUpperCase();
      if (!plate) return;

      const vehicle = await db.getVehicleByPlate(plate);
      if (vehicle) {
        const client = await db.get('clients', vehicle.clientId);
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
          <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 10px; border-left: 4px solid var(--accent); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 style="color: #fff; margin-bottom: 5px;">${vehicle.brand} ${vehicle.model} (${vehicle.year})</h4>
              <p style="font-size: 14px; color: var(--text-muted);">
                <strong>Placa:</strong> ${vehicle.plate} | <strong>Propietario:</strong> ${client ? client.name : 'Desconocido'} (${client ? client.phone : ''})
              </p>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-primary" onclick="location.hash = '#orders?new_order_vehicle=${vehicle.id}&new_order_client=${vehicle.clientId}'" style="font-size: 13px; padding: 8px 12px;">
                + Crear Orden
              </button>
              <button class="btn btn-secondary" onclick="location.hash = '#clients?edit=${client.id}'" style="font-size: 13px; padding: 8px 12px;">
                Ver Ficha Cliente
              </button>
            </div>
          </div>
        `;
      } else {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
          <div style="background: rgba(220, 38, 38, 0.1); padding: 15px; border-radius: 10px; border: 1px solid rgba(220, 38, 38, 0.2); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <p style="color: #fff; font-weight: 500;">La placa "${plate}" no está registrada en el sistema.</p>
              <p style="font-size: 13px; color: var(--text-muted);">Puedes registrar el vehículo creando primero a su propietario o asociándolo a un cliente existente.</p>
            </div>
            <button class="btn btn-primary" onclick="location.hash = '#clients?new_vehicle_plate=${plate}'" style="font-size: 13px; padding: 8px 12px;">
              Registrar Placa
            </button>
          </div>
        `;
      }
    };

    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearch);
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    // Export Backup
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const jsonBackup = await db.exportBackup();
          const blob = new Blob([jsonBackup], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `daza_backup_${new Date().toISOString().slice(0, 10)}.json`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          alert('Error al exportar la copia de seguridad: ' + err.message);
        }
      });
    }

    // Import Backup
    const importBtn = document.getElementById('btn-import-backup');
    const fileInput = document.getElementById('file-import-db');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const confirmed = confirm('ATENCIÓN: Al restaurar esta copia de seguridad, se reemplazarán todos los datos locales actuales. ¿Deseas continuar?');
            if (confirmed) {
              await db.importBackup(event.target.result);
              alert('Copia de seguridad restaurada con éxito.');
              window.location.reload();
            }
          } catch (err) {
            alert('Error al importar la copia de seguridad: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }
  }
};
