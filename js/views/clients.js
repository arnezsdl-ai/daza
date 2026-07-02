const ClientsView = {
  render: async () => {
    const clients = await db.getAll('clients');
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const editId = urlParams.get('edit');
    const newVehiclePlate = urlParams.get('new_vehicle_plate');

    let clientToEdit = null;
    let clientVehicles = [];
    if (editId) {
      clientToEdit = await db.get('clients', Number(editId));
      if (clientToEdit) {
        clientVehicles = await db.getVehiclesByClient(clientToEdit.id);
      }
    }

    return `
      <div class="header-row">
        <div>
          <h1 class="page-title">Clientes y Vehículos</h1>
          <p class="page-subtitle">Gestión de propietarios y registro de vehículos por Placa</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-export-clients" title="Exportar Clientes a CSV para Excel">
            Exportar Excel
          </button>
          <button class="btn btn-primary" id="btn-new-client">+ Nuevo Cliente</button>
        </div>
      </div>

      <!-- Buscador -->
      <div class="search-container">
        <input type="text" id="search-clients-input" class="search-input" placeholder="Buscar cliente por nombre o teléfono...">
      </div>

      <div class="grid-cols-2">
        <!-- Listado de Clientes -->
        <div class="card">
          <h3 class="card-title">Listado de Clientes</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono / Contacto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="clients-list-tbody">
                ${clients.length === 0 ? `
                  <tr>
                    <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 30px;">
                      No hay clientes registrados en el sistema.
                    </td>
                  </tr>
                ` : clients.map(client => `
                  <tr class="client-row" data-name="${client.name.toLowerCase()}" data-phone="${client.phone}">
                    <td><strong>${client.name}</strong><br><span style="font-size: 12px; color: var(--text-muted);">${client.email || 'Sin correo'}</span></td>
                    <td>
                      <a href="https://wa.me/591${client.phone.replace(/\D/g,'')}" target="_blank" style="color: var(--accent); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                        ${client.phone}
                        <svg xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025 8.94 8.94 0 01-2.24-5.83C3.65 7.444 7.68 3.75 12.65 3.75s9 3.694 9 8.25z" />
                        </svg>
                      </a>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="location.hash = '#clients?edit=${client.id}'" style="padding: 5px 10px; font-size: 12px;">
                        Ver Ficha / Editar
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Ficha de Cliente Seleccionado (Detalles y Vehículos) -->
        <div class="card" id="client-detail-panel" style="${clientToEdit ? '' : 'display: none;'}">
          ${clientToEdit ? `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px;">
              <div>
                <h3 style="color: #fff; margin-bottom: 4px;">Ficha de: ${clientToEdit.name}</h3>
                <p style="font-size: 14px; color: var(--text-muted);">${clientToEdit.phone} | ${clientToEdit.email || 'Sin correo'}</p>
              </div>
              <button class="btn btn-secondary" id="btn-edit-client-info" style="font-size: 12px; padding: 6px 12px;">
                Editar Datos
              </button>
            </div>

            <!-- Listado de sus Vehículos -->
            <div style="margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="font-size: 16px; color: #fff;">Vehículos Registrados</h4>
                <button class="btn btn-primary" id="btn-add-vehicle" style="font-size: 12px; padding: 6px 12px;">
                  + Registrar Vehículo
                </button>
              </div>
              
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Placa</th>
                      <th>Marca / Modelo</th>
                      <th>Año</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${clientVehicles.length === 0 ? `
                      <tr>
                        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px; font-size: 13px;">
                          No hay vehículos registrados para este cliente.
                        </td>
                      </tr>
                    ` : clientVehicles.map(vehicle => `
                      <tr>
                        <td><span style="font-size: 12px; background: var(--bg-tertiary); padding: 4px 8px; border-radius: 6px; font-weight: bold; color: var(--accent); border: 1px solid var(--border-color);">${vehicle.plate}</span></td>
                        <td>${vehicle.brand} ${vehicle.model}</td>
                        <td>${vehicle.year || 'N/A'}</td>
                        <td>
                          <div style="display: flex; gap: 5px;">
                            <button class="btn btn-secondary btn-sm" onclick="location.hash = '#orders?new_order_vehicle=${vehicle.id}&new_order_client=${clientToEdit.id}'" style="padding: 4px 8px; font-size: 11px;" title="Nueva Orden de Trabajo">
                              + Orden
                            </button>
                            <button class="btn btn-secondary btn-sm btn-edit-veh" data-id="${vehicle.id}" style="padding: 4px 8px; font-size: 11px;">
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : `
            <div style="text-align: center; color: var(--text-muted); padding: 40px;">
              Seleccione un cliente del listado para ver sus vehículos y gestionar su información.
            </div>
          `}
        </div>
      </div>

      <!-- MODAL CLIENTE (Crear / Editar) -->
      <div class="modal-overlay" id="modal-client" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-client-title">Nuevo Cliente</h3>
            <button class="btn btn-secondary" id="modal-client-close" style="padding: 5px 10px;">X</button>
          </div>
          <div class="modal-body">
            <form id="form-client">
              <input type="hidden" id="client-id-field">
              <div class="form-group">
                <label for="client-name">Nombre Completo *</label>
                <input type="text" id="client-name" class="form-control" required placeholder="Ej: Juan Pérez">
              </div>
              <div class="form-group">
                <label for="client-phone">Teléfono de Contacto (Bolivia) *</label>
                <input type="tel" id="client-phone" class="form-control" required placeholder="Ej: 71234567">
              </div>
              <div class="form-group">
                <label for="client-email">Correo Electrónico</label>
                <input type="email" id="client-email" class="form-control" placeholder="Ej: juan@gmail.com">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-client">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-client">Guardar Cliente</button>
          </div>
        </div>
      </div>

      <!-- MODAL VEHÍCULO (Crear / Editar) -->
      <div class="modal-overlay" id="modal-vehicle" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-vehicle-title">Registrar Vehículo</h3>
            <button class="btn btn-secondary" id="modal-vehicle-close" style="padding: 5px 10px;">X</button>
          </div>
          <div class="modal-body">
            <form id="form-vehicle">
              <input type="hidden" id="vehicle-id-field">
              <input type="hidden" id="vehicle-client-id-field" value="${editId || ''}">
              
              <div class="form-group">
                <label for="vehicle-plate">Placa de Vehículo *</label>
                <input type="text" id="vehicle-plate" class="form-control" required style="text-transform: uppercase;" placeholder="Ej: 4829ABC" value="${newVehiclePlate || ''}">
              </div>
              <div class="form-group">
                <label for="vehicle-brand">Marca *</label>
                <input type="text" id="vehicle-brand" class="form-control" required placeholder="Ej: Toyota">
              </div>
              <div class="form-group">
                <label for="vehicle-model">Modelo *</label>
                <input type="text" id="vehicle-model" class="form-control" required placeholder="Ej: Hilux">
              </div>
              <div class="form-group">
                <label for="vehicle-year">Año</label>
                <input type="number" id="vehicle-year" class="form-control" min="1950" max="2030" placeholder="Ej: 2018">
              </div>
              <div class="form-group">
                <label for="vehicle-mileage">Kilometraje Actual (km)</label>
                <input type="number" id="vehicle-mileage" class="form-control" placeholder="Ej: 125000">
              </div>
              <div class="form-group">
                <label for="vehicle-vin">Número de Chasis / VIN</label>
                <input type="text" id="vehicle-vin" class="form-control" style="text-transform: uppercase;" placeholder="Nro de Chasis para repuestos">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cancel-vehicle">Cancelar</button>
            <button class="btn btn-primary" id="btn-save-vehicle">Guardar Vehículo</button>
          </div>
        </div>
      </div>
    `;
  },

  initListeners: () => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const editId = urlParams.get('edit');
    const newVehiclePlate = urlParams.get('new_vehicle_plate');

    // Search Client list offline
    const searchInput = document.getElementById('search-clients-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.client-row');
        rows.forEach(row => {
          const name = row.getAttribute('data-name');
          const phone = row.getAttribute('data-phone');
          if (name.includes(query) || phone.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // Export clients to Excel/CSV
    const exportBtn = document.getElementById('btn-export-clients');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => db.downloadCSV('clients'));
    }

    // Modal Client Controls
    const modalClient = document.getElementById('modal-client');
    const btnNewClient = document.getElementById('btn-new-client');
    const btnCancelClient = document.getElementById('btn-cancel-client');
    const btnSaveClient = document.getElementById('btn-save-client');
    const modalClientClose = document.getElementById('modal-client-close');
    const formClient = document.getElementById('form-client');
    const clientIdField = document.getElementById('client-id-field');

    const showClientModal = (client = null) => {
      modalClient.style.display = 'flex';
      if (client) {
        document.getElementById('modal-client-title').innerText = 'Editar Cliente';
        clientIdField.value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-email').value = client.email || '';
      } else {
        document.getElementById('modal-client-title').innerText = 'Nuevo Cliente';
        formClient.reset();
        clientIdField.value = '';
      }
    };

    if (btnNewClient) btnNewClient.addEventListener('click', () => showClientModal());
    if (btnCancelClient) btnCancelClient.addEventListener('click', () => modalClient.style.display = 'none');
    if (modalClientClose) modalClientClose.addEventListener('click', () => modalClient.style.display = 'none');

    // Edit client button inside Detail view
    const btnEditClientInfo = document.getElementById('btn-edit-client-info');
    if (btnEditClientInfo && editId) {
      btnEditClientInfo.addEventListener('click', async () => {
        const client = await db.get('clients', Number(editId));
        if (client) showClientModal(client);
      });
    }

    // Save Client
    if (btnSaveClient) {
      btnSaveClient.addEventListener('click', async () => {
        if (!formClient.reportValidity()) return;

        const name = document.getElementById('client-name').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const email = document.getElementById('client-email').value.trim();
        const id = clientIdField.value;

        const clientData = { name, phone, email, createdAt: new Date().toISOString() };
        
        try {
          if (id) {
            clientData.id = Number(id);
            const oldClient = await db.get('clients', clientData.id);
            clientData.createdAt = oldClient.createdAt;
            await db.put('clients', clientData);
            alert('Cliente actualizado con éxito.');
          } else {
            const newId = await db.add('clients', clientData);
            alert('Cliente registrado con éxito.');
            location.hash = `#clients?edit=${newId}`;
            return;
          }
          modalClient.style.display = 'none';
          location.hash = `#clients?edit=${clientData.id || id}`;
          // Reload view manually if hash didn't change
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (err) {
          alert('Error al guardar cliente: ' + err.message);
        }
      });
    }

    // Vehicle Modal Controls
    const modalVehicle = document.getElementById('modal-vehicle');
    const btnAddVehicle = document.getElementById('btn-add-vehicle');
    const btnCancelVehicle = document.getElementById('btn-cancel-vehicle');
    const btnSaveVehicle = document.getElementById('btn-save-vehicle');
    const modalVehicleClose = document.getElementById('modal-vehicle-close');
    const formVehicle = document.getElementById('form-vehicle');
    const vehicleIdField = document.getElementById('vehicle-id-field');
    const vehicleClientIdField = document.getElementById('vehicle-client-id-field');

    // Trigger auto-open vehicle modal if new_vehicle_plate query parameter exists
    if (newVehiclePlate && !editId) {
      // The user clicked "Registrar Placa" from Dashboard search results.
      // Ask which client to assign it to or create a new client first.
      const registerWithNewClient = confirm('Para registrar un vehículo, primero necesitamos asignarlo a un Cliente.\n¿Deseas crear un nuevo Cliente primero?');
      if (registerWithNewClient) {
        showClientModal();
      } else {
        alert('Por favor, seleccione una Ficha de Cliente del listado y luego haga clic en "+ Registrar Vehículo"');
        location.hash = '#clients';
      }
    } else if (newVehiclePlate && editId) {
      modalVehicle.style.display = 'flex';
    }

    const showVehicleModal = (vehicle = null) => {
      modalVehicle.style.display = 'flex';
      if (vehicle) {
        document.getElementById('modal-vehicle-title').innerText = 'Editar Vehículo';
        vehicleIdField.value = vehicle.id;
        vehicleClientIdField.value = vehicle.clientId;
        document.getElementById('vehicle-plate').value = vehicle.plate;
        document.getElementById('vehicle-brand').value = vehicle.brand;
        document.getElementById('vehicle-model').value = vehicle.model;
        document.getElementById('vehicle-year').value = vehicle.year || '';
        document.getElementById('vehicle-mileage').value = vehicle.mileage || '';
        document.getElementById('vehicle-vin').value = vehicle.vin || '';
      } else {
        document.getElementById('modal-vehicle-title').innerText = 'Registrar Vehículo';
        formVehicle.reset();
        vehicleIdField.value = '';
        vehicleClientIdField.value = editId;
      }
    };

    if (btnAddVehicle) btnAddVehicle.addEventListener('click', () => showVehicleModal());
    if (btnCancelVehicle) btnCancelVehicle.addEventListener('click', () => modalVehicle.style.display = 'none');
    if (modalVehicleClose) modalVehicleClose.addEventListener('click', () => modalVehicle.style.display = 'none');

    // Edit Vehicle (Click handler for dynamically rendered edit buttons)
    const editVehBtns = document.querySelectorAll('.btn-edit-veh');
    editVehBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const vId = e.currentTarget.getAttribute('data-id');
        const vehicle = await db.get('vehicles', Number(vId));
        if (vehicle) showVehicleModal(vehicle);
      });
    });

    // Save Vehicle
    if (btnSaveVehicle) {
      btnSaveVehicle.addEventListener('click', async () => {
        if (!formVehicle.reportValidity()) return;

        const plate = document.getElementById('vehicle-plate').value.trim().toUpperCase();
        const brand = document.getElementById('vehicle-brand').value.trim();
        const model = document.getElementById('vehicle-model').value.trim();
        const year = document.getElementById('vehicle-year').value ? Number(document.getElementById('vehicle-year').value) : null;
        const mileage = document.getElementById('vehicle-mileage').value ? Number(document.getElementById('vehicle-mileage').value) : null;
        const vin = document.getElementById('vehicle-vin').value.trim().toUpperCase();
        
        const id = vehicleIdField.value;
        const clientId = Number(vehicleClientIdField.value);

        if (!clientId) {
          alert('Error: Debe seleccionar un cliente antes de guardar el vehículo.');
          return;
        }

        const vehicleData = { clientId, plate, brand, model, year, mileage, vin, createdAt: new Date().toISOString() };
        
        try {
          if (id) {
            vehicleData.id = Number(id);
            const oldVeh = await db.get('vehicles', vehicleData.id);
            vehicleData.createdAt = oldVeh.createdAt;
            await db.put('vehicles', vehicleData);
            alert('Vehículo actualizado con éxito.');
          } else {
            await db.add('vehicles', vehicleData);
            alert('Vehículo registrado y asociado al cliente con éxito.');
          }
          modalVehicle.style.display = 'none';
          location.hash = `#clients?edit=${clientId}`;
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        } catch (err) {
          alert('Error al guardar vehículo: ' + err.message);
        }
      });
    }
  }
};
