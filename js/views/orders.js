const OrdersView = {
  render: async () => {
    const orders = await db.getOrdersForDashboard();
    const inventory = await db.getAll('inventory');
    const clients = await db.getAll('clients');
    const vehicles = await db.getAll('vehicles');

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const editId = urlParams.get('edit');
    const newOrderVehicleId = urlParams.get('new_order_vehicle');
    const newOrderClientId = urlParams.get('new_order_client');

    let orderToEdit = null;
    let orderClient = null;
    let orderVehicle = null;

    if (editId) {
      orderToEdit = await db.get('orders', Number(editId));
      if (orderToEdit) {
        orderClient = await db.get('clients', orderToEdit.clientId);
        orderVehicle = await db.get('vehicles', orderToEdit.vehicleId);
      }
    } else if (newOrderVehicleId && newOrderClientId) {
      orderVehicle = await db.get('vehicles', Number(newOrderVehicleId));
      orderClient = await db.get('clients', Number(newOrderClientId));
    }

    return `
      <div class="header-row">
        <div>
          <h1 class="page-title">Órdenes de Trabajo</h1>
          <p class="page-subtitle">Control de servicios, cotizaciones y firmas de conformidad</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-export-orders" title="Exportar Órdenes a Excel">
            Exportar Excel
          </button>
          <button class="btn btn-primary" id="btn-new-order">+ Nueva Orden (OT)</button>
        </div>
      </div>

      <!-- Buscador principal de órdenes -->
      <div class="search-container" style="${orderToEdit || newOrderVehicleId ? 'display:none;' : ''}">
        <input type="text" id="search-orders-input" class="search-input" placeholder="Buscar orden por Placa, Cliente o Nro de OT...">
      </div>

      <div class="grid-cols-2" style="${orderToEdit || newOrderVehicleId ? 'grid-template-columns: 1fr;' : ''}">
        <!-- Listado de Órdenes -->
        <div class="card" style="${orderToEdit || newOrderVehicleId ? 'display: none;' : ''}">
          <h3 class="card-title">Listado de Órdenes de Trabajo</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>OT #</th>
                  <th>Placa / Vehículo</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total (Bs.)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="orders-list-tbody">
                ${orders.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                      No hay órdenes de trabajo registradas.
                    </td>
                  </tr>
                ` : orders.map(order => `
                  <tr class="order-row" data-id="${order.id}" data-client="${order.client.name.toLowerCase()}" data-plate="${order.vehicle.plate.toLowerCase()}">
                    <td><strong>${order.id}</strong></td>
                    <td>
                      <span style="font-size: 11px; background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; font-weight: bold; color: var(--accent); border: 1px solid var(--border-color);">${order.vehicle.plate}</span>
                      <br><span style="font-size: 12px; color: var(--text-muted);">${order.vehicle.brand} ${order.vehicle.model}</span>
                    </td>
                    <td>${order.client.name}</td>
                    <td><span class="badge badge-${order.status}">${OrdersView.getStatusLabel(order.status)}</span></td>
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

        <!-- CREADOR / EDITOR DE ORDEN -->
        <div class="card" id="order-editor-panel" style="${orderToEdit || newOrderVehicleId ? '' : 'display: none;'}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
            <h3 style="color: #fff;" id="editor-title">${orderToEdit ? `Gestionar Orden de Trabajo #${orderToEdit.id}` : 'Nueva Orden de Trabajo (OT)'}</h3>
            <button class="btn btn-secondary" onclick="location.hash = '#orders'" style="padding: 6px 12px; font-size: 12px;">
              Volver al Listado
            </button>
          </div>

          <form id="form-order">
            <input type="hidden" id="order-id" value="${orderToEdit ? orderToEdit.id : ''}">
            
            <div class="grid-cols-2" style="margin-bottom: 15px;">
              <div class="form-group">
                <label>Cliente Propietario</label>
                <select id="order-client-select" class="form-control" ${orderToEdit || newOrderClientId ? 'disabled' : ''}>
                  <option value="">-- Seleccionar Cliente --</option>
                  ${clients.map(c => `<option value="${c.id}" ${orderClient && orderClient.id === c.id ? 'selected' : ''}>${c.name} (${c.phone})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Vehículo / Placa *</label>
                <select id="order-vehicle-select" class="form-control" required ${orderToEdit || newOrderVehicleId ? 'disabled' : ''}>
                  <option value="">-- Seleccionar Vehículo --</option>
                  ${vehicles.map(v => `<option value="${v.id}" data-client="${v.clientId}" ${orderVehicle && orderVehicle.id === v.id ? 'selected' : ''}>${v.plate} - ${v.brand} ${v.model}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid-cols-2" style="margin-bottom: 15px;">
              <div class="form-group">
                <label for="order-symptoms">Síntomas / Reporte del Cliente *</label>
                <textarea id="order-symptoms" class="form-control" rows="3" required placeholder="Ej: Ruidos extraños en el tren delantero al doblar a la derecha.">${orderToEdit ? orderToEdit.symptoms : ''}</textarea>
              </div>
              <div class="form-group">
                <label for="order-diagnosis">Diagnóstico Técnico / Trabajo a Realizar</label>
                <textarea id="order-diagnosis" class="form-control" rows="3" placeholder="Ej: Falla en el rodamiento del lado derecho. Requiere reemplazo del rodamiento y alineación.">${orderToEdit ? (orderToEdit.diagnosis || '') : ''}</textarea>
              </div>
            </div>

            <!-- Estado de la Orden -->
            <div class="form-group" style="max-width: 300px; margin-bottom: 25px;">
              <label for="order-status">Estado del Vehículo en Taller</label>
              <select id="order-status" class="form-control">
                <option value="draft" ${orderToEdit && orderToEdit.status === 'draft' ? 'selected' : ''}>Presupuesto (Borrador)</option>
                <option value="diagnosis" ${orderToEdit && orderToEdit.status === 'diagnosis' ? 'selected' : ''}>En Diagnóstico</option>
                <option value="parts" ${orderToEdit && orderToEdit.status === 'parts' ? 'selected' : ''}>Esperando Repuestos</option>
                <option value="progress" ${orderToEdit && orderToEdit.status === 'progress' ? 'selected' : ''}>En Progreso (Mantenimiento)</option>
                <option value="ready" ${orderToEdit && orderToEdit.status === 'ready' ? 'selected' : ''}>Listo para entrega</option>
                <option value="done" ${orderToEdit && orderToEdit.status === 'done' ? 'selected' : ''}>Entregado (Trabajo Terminado)</option>
              </select>
            </div>

            <!-- Mano de Obra y Repuestos -->
            <div class="card" style="background: var(--bg-tertiary); margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="color: #fff; font-size: 15px;">Detalle de Repuestos y Mano de Obra</h4>
                <div style="display: flex; gap: 8px;">
                  <!-- Agregar desde Inventario -->
                  <select id="select-inventory-item" class="form-control" style="width: 220px; padding: 6px 12px; font-size: 13px;">
                    <option value="">+ Añadir desde Inventario</option>
                    ${inventory.map(item => `<option value="${item.id}" data-price="${item.sellPrice}">${item.sku} - ${item.name} (Bs. ${item.sellPrice})</option>`).join('')}
                  </select>
                  <button type="button" class="btn btn-secondary" id="btn-add-labor-row" style="padding: 6px 12px; font-size: 13px;">
                    + Mano de Obra
                  </button>
                </div>
              </div>

              <!-- Listado de Items Agregados -->
              <div id="order-items-container">
                <!-- Se poblará dinámicamente -->
              </div>

              <div style="display: flex; justify-content: flex-end; margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <div style="font-size: 18px; font-weight: 700;">
                  Total General: Bs. <span id="order-total-amount">0.00</span>
                </div>
              </div>
            </div>

            <!-- Firma Digital del Cliente (Conformidad) -->
            <div class="grid-cols-2" style="margin-bottom: 25px; align-items: flex-end;">
              <div>
                <label style="display: block; font-size: 13px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px;">
                  Firma de Conformidad del Cliente (Táctil)
                </label>
                <div class="signature-container">
                  <canvas class="signature-canvas" id="sig-canvas"></canvas>
                </div>
                <button type="button" class="btn btn-secondary" id="btn-clear-sig" style="font-size: 12px; padding: 5px 12px;">
                  Limpiar Firma
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${orderToEdit ? `
                  <button type="button" class="btn btn-secondary" id="btn-print-pdf">
                    📄 Imprimir Presupuesto / Generar PDF
                  </button>
                  <button type="button" class="btn btn-secondary" id="btn-share-whatsapp" style="background: rgba(37,211,102,0.1); border-color: rgba(37,211,102,0.2); color: #25d366;">
                    💬 Compartir por WhatsApp
                  </button>
                ` : ''}
                <button type="button" class="btn btn-primary" id="btn-save-order" style="height: 45px; font-size: 16px;">
                  Guardar Orden de Trabajo
                </button>
              </div>
            </div>
          </form>
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
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const editId = urlParams.get('edit');
    const newOrderVehicleId = urlParams.get('new_order_vehicle');
    const newOrderClientId = urlParams.get('new_order_client');

    const searchInput = document.getElementById('search-orders-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.order-row');
        rows.forEach(row => {
          const id = row.getAttribute('data-id');
          const client = row.getAttribute('data-client');
          const plate = row.getAttribute('data-plate');
          if (id.includes(query) || client.includes(query) || plate.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // Export Excel/CSV
    const exportBtn = document.getElementById('btn-export-orders');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => db.downloadCSV('orders'));
    }

    // Redirect to create new order from list page
    const btnNewOrder = document.getElementById('btn-new-order');
    if (btnNewOrder) {
      btnNewOrder.addEventListener('click', () => {
        location.hash = '#clients';
        alert('Para crear una orden, primero seleccione o registre un Cliente y luego asocie la orden a uno de sus vehículos en su ficha.');
      });
    }

    // Client/Vehicle Linkage if creating a completely blank order
    const clientSelect = document.getElementById('order-client-select');
    const vehicleSelect = document.getElementById('order-vehicle-select');
    if (clientSelect && vehicleSelect) {
      clientSelect.addEventListener('change', () => {
        const cId = clientSelect.value;
        // Filter vehicle options based on selected client
        const options = vehicleSelect.querySelectorAll('option');
        options.forEach(opt => {
          if (opt.value === '') {
            opt.style.display = '';
            return;
          }
          const vClientId = opt.getAttribute('data-client');
          if (vClientId === cId) {
            opt.style.display = '';
          } else {
            opt.style.display = 'none';
          }
        });
        vehicleSelect.value = '';
      });
    }

    // --- Dynamic Items Editor System ---
    const itemsContainer = document.getElementById('order-items-container');
    const selectInventory = document.getElementById('select-inventory-item');
    const btnAddLabor = document.getElementById('btn-add-labor-row');
    const totalAmountSpan = document.getElementById('order-total-amount');

    let orderItems = [];

    const calculateTotal = () => {
      let total = 0;
      const rows = itemsContainer.querySelectorAll('.item-row');
      rows.forEach(row => {
        const qty = Number(row.querySelector('.item-qty').value) || 0;
        const price = Number(row.querySelector('.item-price').value) || 0;
        total += qty * price;
      });
      totalAmountSpan.innerText = total.toFixed(2);
    };

    const addItemRow = (item = null) => {
      const id = Date.now() + Math.random().toString(36).substring(7);
      const row = document.createElement('div');
      row.className = 'item-row';
      row.setAttribute('data-id', id);
      
      const isInventory = item && item.inventoryId;

      row.innerHTML = `
        <input type="text" class="form-control item-desc" placeholder="${isInventory ? 'Repuesto' : 'Descripción mano de obra...'}" value="${item ? item.description : ''}" required ${isInventory ? 'readonly' : ''}>
        <input type="number" class="form-control item-qty" min="1" placeholder="Cant." value="${item ? item.qty : 1}" required style="text-align: center;">
        <input type="number" class="form-control item-price" min="0" step="0.1" placeholder="Precio (Bs.)" value="${item ? item.price : 0.00}" required ${isInventory ? 'readonly' : ''}>
        <button type="button" class="btn btn-danger btn-delete-row" style="padding: 10px; border-radius: 8px;">X</button>
        <input type="hidden" class="item-inventory-id" value="${item && item.inventoryId ? item.inventoryId : ''}">
      `;
      
      itemsContainer.appendChild(row);

      // Add listeners
      row.querySelector('.item-qty').addEventListener('input', calculateTotal);
      row.querySelector('.item-price').addEventListener('input', calculateTotal);
      row.querySelector('.btn-delete-row').addEventListener('click', () => {
        row.remove();
        calculateTotal();
      });

      calculateTotal();
    };

    // Load existing items if editing
    if (editId) {
      db.get('orders', Number(editId)).then(order => {
        if (order && Array.isArray(order.items)) {
          order.items.forEach(item => addItemRow(item));
        }
      });
    } else {
      // Add one empty labor row by default for a fresh form
      addItemRow();
    }

    // Add inventory item trigger
    if (selectInventory) {
      selectInventory.addEventListener('change', async () => {
        const itemId = selectInventory.value;
        if (!itemId) return;

        const inventoryItem = await db.get('inventory', Number(itemId));
        if (inventoryItem) {
          if (Number(inventoryItem.quantity) <= 0) {
            alert('Atención: Este repuesto está agotado en inventario. Aún puedes añadirlo si lo compras por fuera.');
          }

          addItemRow({
            description: `[REP] ${inventoryItem.name} (${inventoryItem.sku})`,
            qty: 1,
            price: inventoryItem.sellPrice,
            inventoryId: inventoryItem.id
          });
        }
        selectInventory.value = ''; // Reset select dropdown
      });
    }

    if (btnAddLabor) {
      btnAddLabor.addEventListener('click', () => {
        addItemRow({
          description: 'Mano de obra: ',
          qty: 1,
          price: 50.00,
          inventoryId: null
        });
      });
    }


    // --- DIGITAL SIGNATURE CANVAS ---
    const canvas = document.getElementById('sig-canvas');
    let ctx = null;
    let drawing = false;

    if (canvas) {
      ctx = canvas.getContext('2d');
      // Set line style
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = 3;

      // Handle touch and mouse events
      const getMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        // Scale correctly due to dynamic layout
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        }

        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      };

      const startDrawing = (e) => {
        e.preventDefault();
        drawing = true;
        const pos = getMousePos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const pos = getMousePos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      };

      const stopDrawing = () => {
        drawing = false;
      };

      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      
      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing);

      // Clear signature
      document.getElementById('btn-clear-sig').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });

      // Load existing signature if editing
      if (editId) {
        db.get('orders', Number(editId)).then(order => {
          if (order && order.signature) {
            const img = new Image();
            img.onload = () => {
              // Adjust layout size match
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = order.signature;
          }
        });
      }
    }


    // --- SAVE WORK ORDER ---
    const btnSaveOrder = document.getElementById('btn-save-order');
    if (btnSaveOrder) {
      btnSaveOrder.addEventListener('click', async () => {
        const vSelect = document.getElementById('order-vehicle-select');
        const cSelect = document.getElementById('order-client-select');
        
        const vehicleId = Number(vSelect.value || newOrderVehicleId);
        const clientId = Number(cSelect.value || newOrderClientId);

        if (!vehicleId || !clientId) {
          alert('Por favor, asocie un cliente y un vehículo a esta orden.');
          return;
        }

        const symptoms = document.getElementById('order-symptoms').value.trim();
        const diagnosis = document.getElementById('order-diagnosis').value.trim();
        const status = document.getElementById('order-status').value;
        const id = document.getElementById('order-id').value;

        if (!symptoms) {
          alert('Por favor, complete el reporte de síntomas del cliente.');
          return;
        }

        // Build items
        const itemRows = itemsContainer.querySelectorAll('.item-row');
        const items = Array.from(itemRows).map(row => ({
          description: row.querySelector('.item-desc').value.trim(),
          qty: Number(row.querySelector('.item-qty').value) || 1,
          price: Number(row.querySelector('.item-price').value) || 0,
          inventoryId: row.querySelector('.item-inventory-id').value ? Number(row.querySelector('.item-inventory-id').value) : null
        }));

        const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);

        // Get signature image as Data URL if canvas has drawings
        let signatureDataUrl = '';
        if (canvas) {
          // Check if canvas is blank
          const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
          const isBlank = !buffer.some(color => color !== 0);
          if (!isBlank) {
            signatureDataUrl = canvas.toDataURL();
          } else if (editId) {
            // Retain old signature if it existed
            const oldOrder = await db.get('orders', Number(editId));
            if (oldOrder) signatureDataUrl = oldOrder.signature;
          }
        }

        const orderData = {
          clientId,
          vehicleId,
          symptoms,
          diagnosis,
          status,
          items,
          totalAmount,
          signature: signatureDataUrl,
          updatedAt: new Date().toISOString()
        };

        try {
          if (id) {
            orderData.id = Number(id);
            const oldOrder = await db.get('orders', orderData.id);
            orderData.createdAt = oldOrder.createdAt;
            
            // Deduct stock if status changed to "done" or "ready" and it wasn't before
            if ((status === 'done' || status === 'ready') && oldOrder.status !== 'done' && oldOrder.status !== 'ready') {
              for (const item of items) {
                if (item.inventoryId) {
                  const invItem = await db.get('inventory', item.inventoryId);
                  if (invItem) {
                    invItem.quantity = Math.max(0, Number(invItem.quantity) - item.qty);
                    await db.put('inventory', invItem);
                  }
                }
              }
            }

            await db.put('orders', orderData);
            alert('Orden de Trabajo actualizada con éxito.');
          } else {
            orderData.createdAt = new Date().toISOString();
            const newId = await db.add('orders', orderData);
            alert('Orden de Trabajo registrada con éxito.');
            location.hash = `#orders?edit=${newId}`;
            return;
          }
          location.hash = '#orders';
        } catch (err) {
          alert('Error al guardar la orden de trabajo: ' + err.message);
        }
      });
    }

    // --- PRINT / SAVE PDF ACTION ---
    const btnPrintPdf = document.getElementById('btn-print-pdf');
    if (btnPrintPdf && editId && orderClient && orderVehicle && orderToEdit) {
      btnPrintPdf.addEventListener('click', () => {
        const printArea = document.getElementById('print-area');
        
        // Populate HTML to the print section
        printArea.innerHTML = `
          <div class="print-header">
            <div>
              <div class="print-title">DAZA - Taller Mecánico</div>
              <p>Dirección: Calle Mecánicos Nro 123, Santa Cruz, Bolivia</p>
              <p>Contacto: +591 71234567 | daza.bo</p>
            </div>
            <div style="text-align: right;">
              <h2>ORDEN DE TRABAJO #${orderToEdit.id}</h2>
              <p><strong>Fecha:</strong> ${new Date(orderToEdit.createdAt).toLocaleDateString()}</p>
              <p><strong>Estado:</strong> ${OrdersView.getStatusLabel(orderToEdit.status)}</p>
            </div>
          </div>

          <div class="print-meta-grid">
            <div>
              <h3>DATOS DEL CLIENTE</h3>
              <p><strong>Propietario:</strong> ${orderClient.name}</p>
              <p><strong>Teléfono:</strong> ${orderClient.phone}</p>
              <p><strong>Correo:</strong> ${orderClient.email || 'N/A'}</p>
            </div>
            <div>
              <h3>DATOS DEL VEHÍCULO</h3>
              <p><strong>Placa (Bolivia):</strong> ${orderVehicle.plate}</p>
              <p><strong>Marca / Modelo:</strong> ${orderVehicle.brand} ${orderVehicle.model} (${orderVehicle.year || 'N/A'})</p>
              <p><strong>Kilometraje:</strong> ${orderVehicle.mileage ? orderVehicle.mileage.toLocaleString() + ' km' : 'N/A'}</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3>DETALLE DEL REPORTE / SÍNTOMAS</h3>
            <p style="background: #f9fafb; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              ${orderToEdit.symptoms}
            </p>
          </div>

          ${orderToEdit.diagnosis ? `
            <div style="margin-bottom: 20px;">
              <h3>DIAGNÓSTICO TÉCNICO</h3>
              <p style="background: #f9fafb; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                ${orderToEdit.diagnosis}
              </p>
            </div>
          ` : ''}

          <h3>PRESUPUESTO DE MANO DE OBRA Y REPUESTOS</h3>
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 55%; text-align: left;">Descripción</th>
                <th style="width: 15%; text-align: center;">Cantidad</th>
                <th style="width: 15%; text-align: right;">Precio Unit. (Bs.)</th>
                <th style="width: 15%; text-align: right;">Total (Bs.)</th>
              </tr>
            </thead>
            <tbody>
              ${orderToEdit.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align: center;">${item.qty}</td>
                  <td style="text-align: right;">${item.price.toFixed(2)}</td>
                  <td style="text-align: right;"> ${(item.qty * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="print-total-section">
            <div class="print-total-box">
              Total General: Bs. ${(Number(orderToEdit.totalAmount) || 0).toFixed(2)}
            </div>
          </div>

          <div class="print-signatures">
            <div class="print-sig-col">
              <div class="print-line">Firma del Mecánico / Taller</div>
            </div>
            <div class="print-sig-col">
              ${orderToEdit.signature ? `<img class="print-sig-img" src="${orderToEdit.signature}" alt="Firma Cliente">` : '<div style="height: 60px;"></div>'}
              <div class="print-line">Firma de Conformidad del Cliente</div>
            </div>
          </div>
        `;

        // Trigger native browser printing / Save to PDF
        window.print();
      });
    }

    // --- SHARE VIA WHATSAPP ACTION ---
    const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
    if (btnShareWhatsapp && editId && orderClient && orderVehicle && orderToEdit) {
      btnShareWhatsapp.addEventListener('click', () => {
        // Format text message nicely
        let message = `*DAZA - Taller Mecánico*\n`;
        message += `*ORDEN DE TRABAJO #${orderToEdit.id}*\n\n`;
        message += `*Cliente:* ${orderClient.name}\n`;
        message += `*Vehículo/Placa:* ${orderVehicle.plate} (${orderVehicle.brand} ${orderVehicle.model})\n`;
        message += `*Estado:* ${OrdersView.getStatusLabel(orderToEdit.status)}\n\n`;
        message += `*Detalle Presupuesto:*\n`;
        
        orderToEdit.items.forEach(item => {
          message += `- ${item.description} (x${item.qty}): Bs. ${(item.qty * item.price).toFixed(2)}\n`;
        });
        
        message += `\n*TOTAL A PAGAR: Bs. ${(Number(orderToEdit.totalAmount) || 0).toFixed(2)}*\n\n`;
        message += `_Mensaje enviado de forma automática desde la app DAZA PWA._`;

        const encodedMessage = encodeURIComponent(message);
        // Clean phone number from non-digits
        const cleanPhone = orderClient.phone.replace(/\D/g, '');
        // Bolivia country code +591
        const whatsappUrl = `https://wa.me/591${cleanPhone}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
      });
    }
  }
};
