const InventoryView = {
  render: async () => {
    const items = await db.getAll('inventory');
    
    return `
      <div class="header-row">
        <div>
          <h1 class="page-title">Inventario de Repuestos</h1>
          <p class="page-subtitle">Control de existencias, costos y precios de venta</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-export-inventory" title="Exportar Inventario a Excel">
            Exportar Excel
          </button>
          <button class="btn btn-primary" id="btn-new-item">+ Nuevo Repuesto</button>
        </div>
      </div>

      <!-- Buscador y filtro de Stock Crítico -->
      <div class="search-container">
        <input type="text" id="search-inventory-input" class="search-input" placeholder="Buscar por repuesto, descripción o SKU...">
      </div>

      <!-- Tabla de Inventario -->
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>SKU / Código</th>
                <th>Nombre del Repuesto</th>
                <th>Existencia</th>
                <th>Costo (Bs.)</th>
                <th>Precio Venta (Bs.)</th>
                <th>Margen (%)</th>
                <th>Estado Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="inventory-list-tbody">
              ${items.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    No hay repuestos registrados en el inventario.
                  </td>
                </tr>
              ` : items.map(item => {
                const qty = Number(item.quantity) || 0;
                const min = Number(item.minStockAlert) || 0;
                const cost = Number(item.costPrice) || 0;
                const sell = Number(item.sellPrice) || 0;
                
                // Calculate profit margin
                const margin = sell > 0 ? ((sell - cost) / sell * 100) : 0;
                
                let stockStatusBadge = `<span class="badge badge-ready">OK</span>`;
                if (qty === 0) {
                  stockStatusBadge = `<span class="badge badge-progress" style="background: rgba(220, 38, 38, 0.15); color: var(--danger);">Agotado</span>`;
                } else if (qty <= min) {
                  stockStatusBadge = `<span class="badge badge-parts" style="background: rgba(245, 158, 11, 0.15); color: var(--warning);">Crítico</span>`;
                }

                return `
                  <tr class="inventory-row" data-name="${item.name.toLowerCase()}" data-sku="${item.sku.toLowerCase()}">
                    <td><code style="font-family: monospace; font-weight: bold; color: var(--accent);">${item.sku}</code></td>
                    <td><strong>${item.name}</strong></td>
                    <td><strong>${qty}</strong> <span style="font-size: 11px; color: var(--text-muted);">unid.</span></td>
                    <td>Bs. ${cost.toFixed(2)}</td>
                    <td>Bs. ${sell.toFixed(2)}</td>
                    <td><span style="color: ${margin >= 30 ? 'var(--success)' : 'var(--text-muted)'};">${margin.toFixed(0)}%</span></td>
                    <td>${stockStatusBadge}</td>
                    <td>
                      <div style="display: flex; gap: 5px;">
                        <button class="btn btn-secondary btn-sm btn-edit-inventory" data-id="${item.id}" style="padding: 5px 10px; font-size: 12px;">
                          Editar
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-inventory" data-id="${item.id}" style="padding: 5px 10px; font-size: 12px; background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.2); color: var(--danger);">
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL INVENTARIO (Crear / Editar) -->
      <div class="modal-overlay" id="modal-inventory" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-inventory-title">Nuevo Repuesto</h3>
            <button class="btn btn-secondary" id="modal-inventory-close" style="padding: 5px 10px;">X</button>
          </div>
          <div class="modal-body">
            <form id="form-inventory">
              <input type="hidden" id="inventory-id-field">
              
              <div class="form-group">
                <label for="inventory-sku">Código de Referencia / SKU *</label>
                <input type="text" id="inventory-sku" class="form-control" required style="text-transform: uppercase;" placeholder="Ej: FILT-ACE-01">
              </div>
              <div class="form-group">
                <label for="inventory-name">Descripción del Repuesto / Nombre *</label>
                <input type="text" id="inventory-name" class="form-control" required placeholder="Ej: Filtro de Aceite Toyota Hilux">
              </div>
              <div class="grid-cols-2" style="gap: 15px; margin-bottom: 0;">
                <div class="form-group">
                  <label for="inventory-qty">Cantidad Inicial *</label>
                  <input type="number" id="inventory-qty" class="form-control" required min="0" value="0">
                </div>
                <div class="form-group">
                  <label for="inventory-min">Alerta Stock Crítico *</label>
                  <input type="number" id="inventory-min" class="form-control" required min="0" value="2">
                </div>
              </div>
              <div class="grid-cols-2" style="gap: 15px; margin-bottom: 0;">
                <div class="form-group">
                  <label for="inventory-cost">Costo de Compra (Bs.) *</label>
                  <input type="number" id="inventory-cost" class="form-control" required min="0" step="0.1" value="0.00">
                </div>
                <div class="form-group">
                  <label for="inventory-sell">Precio de Venta (Bs.) *</label>
                  <input type="number" id="inventory-sell" class="form-control" required min="0" step="0.1" value="0.00">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-inventory">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-inventory">Guardar</button>
          </div>
        </div>
      </div>
    `;
  },

  initListeners: () => {
    // Search Filter
    const searchInput = document.getElementById('search-inventory-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.inventory-row');
        rows.forEach(row => {
          const name = row.getAttribute('data-name');
          const sku = row.getAttribute('data-sku');
          if (name.includes(query) || sku.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // Export Excel/CSV
    const exportBtn = document.getElementById('btn-export-inventory');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => db.downloadCSV('inventory'));
    }

    // Modal Control
    const modal = document.getElementById('modal-inventory');
    const btnNewItem = document.getElementById('btn-new-item');
    const btnCancel = document.getElementById('btn-cancel-inventory');
    const btnSave = document.getElementById('btn-save-inventory');
    const modalClose = document.getElementById('modal-inventory-close');
    const form = document.getElementById('form-inventory');
    const idField = document.getElementById('inventory-id-field');

    const showModal = (item = null) => {
      modal.style.display = 'flex';
      if (item) {
        document.getElementById('modal-inventory-title').innerText = 'Editar Repuesto';
        idField.value = item.id;
        document.getElementById('inventory-sku').value = item.sku;
        document.getElementById('inventory-name').value = item.name;
        document.getElementById('inventory-qty').value = item.quantity;
        document.getElementById('inventory-min').value = item.minStockAlert;
        document.getElementById('inventory-cost').value = item.costPrice;
        document.getElementById('inventory-sell').value = item.sellPrice;
      } else {
        document.getElementById('modal-inventory-title').innerText = 'Nuevo Repuesto';
        form.reset();
        idField.value = '';
      }
    };

    if (btnNewItem) btnNewItem.addEventListener('click', () => showModal());
    if (btnCancel) btnCancel.addEventListener('click', () => modal.style.display = 'none');
    if (modalClose) modalClose.addEventListener('click', () => modal.style.display = 'none');

    // Edit button clicks
    const editBtns = document.querySelectorAll('.btn-edit-inventory');
    editBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = await db.get('inventory', Number(id));
        if (item) showModal(item);
      });
    });

    // Delete button clicks
    const deleteBtns = document.querySelectorAll('.btn-delete-inventory');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('¿Está seguro de que desea eliminar este repuesto del inventario? Esta acción no se puede deshacer.')) {
          try {
            await db.delete('inventory', Number(id));
            alert('Repuesto eliminado con éxito.');
            window.location.reload();
          } catch (err) {
            alert('Error al eliminar repuesto: ' + err.message);
          }
        }
      });
    });

    // Save Handlers
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        if (!form.reportValidity()) return;

        const sku = document.getElementById('inventory-sku').value.trim().toUpperCase();
        const name = document.getElementById('inventory-name').value.trim();
        const quantity = Number(document.getElementById('inventory-qty').value);
        const minStockAlert = Number(document.getElementById('inventory-min').value);
        const costPrice = Number(document.getElementById('inventory-cost').value);
        const sellPrice = Number(document.getElementById('inventory-sell').value);
        const id = idField.value;

        const itemData = { sku, name, quantity, minStockAlert, costPrice, sellPrice, updatedAt: new Date().toISOString() };

        try {
          if (id) {
            itemData.id = Number(id);
            await db.put('inventory', itemData);
            alert('Repuesto actualizado con éxito.');
          } else {
            itemData.createdAt = new Date().toISOString();
            await db.add('inventory', itemData);
            alert('Repuesto agregado al inventario.');
          }
          modal.style.display = 'none';
          window.location.reload();
        } catch (err) {
          alert('Error al guardar repuesto: ' + err.message);
        }
      });
    }
  }
};
