class DazaDB {
  constructor() {
    this.dbName = 'DazaDB';
    this.version = 1;
    this.db = null;
  }

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
          clientStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains('vehicles')) {
          const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
          vehicleStore.createIndex('plate', 'plate', { unique: true });
          vehicleStore.createIndex('clientId', 'clientId', { unique: false });
        }

        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
          orderStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          orderStore.createIndex('clientId', 'clientId', { unique: false });
          orderStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
          inventoryStore.createIndex('sku', 'sku', { unique: true });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  async ensureDb() {
    if (!this.db) {
      await this.open();
    }
  }

  getAll(storeName) {
    return new Promise(async (resolve, reject) => {
      await this.ensureDb();
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  get(storeName, id) {
    return new Promise(async (resolve, reject) => {
      await this.ensureDb();
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(Number(id) || id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  add(storeName, data) {
    return new Promise(async (resolve, reject) => {
      await this.ensureDb();
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Clean up id if it's empty so autoIncrement triggers
      if (data.id === '' || data.id === null || data.id === undefined) {
        delete data.id;
      }
      
      const request = store.add(data);

      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => {
        // Handle duplicate plate or SKU errors nicely
        if (e.target.error.name === 'ConstraintError') {
          reject(new Error('La Placa o el SKU ya existe en la base de datos.'));
        } else {
          reject(e.target.error);
        }
      };
    });
  }

  put(storeName, data) {
    return new Promise(async (resolve, reject) => {
      await this.ensureDb();
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      if (data.id && typeof data.id === 'string' && !isNaN(data.id)) {
        data.id = Number(data.id);
      }
      
      const request = store.put(data);

      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => reject(request.error);
    });
  }

  delete(storeName, id) {
    return new Promise(async (resolve, reject) => {
      await this.ensureDb();
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(Number(id) || id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Specific custom helpers
  async getVehicleByPlate(plate) {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('vehicles', 'readonly');
      const store = transaction.objectStore('vehicles');
      const index = store.index('plate');
      const request = index.get(plate.trim().toUpperCase());

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getVehiclesByClient(clientId) {
    await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('vehicles', 'readonly');
      const store = transaction.objectStore('vehicles');
      const index = store.index('clientId');
      const request = index.getAll(Number(clientId));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getOrdersForDashboard() {
    const orders = await this.getAll('orders');
    const clients = await this.getAll('clients');
    const vehicles = await this.getAll('vehicles');

    const clientMap = new Map(clients.map(c => [c.id, c]));
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    return orders.map(order => ({
      ...order,
      client: clientMap.get(order.clientId) || { name: 'Desconocido', phone: '' },
      vehicle: vehicleMap.get(order.vehicleId) || { plate: 'N/A', brand: 'Desconocido', model: '' }
    })).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  // Backup & Import
  async exportBackup() {
    const backup = {
      clients: await this.getAll('clients'),
      vehicles: await this.getAll('vehicles'),
      orders: await this.getAll('orders'),
      inventory: await this.getAll('inventory'),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(backup, null, 2);
  }

  async importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      await this.ensureDb();

      const stores = ['clients', 'vehicles', 'orders', 'inventory'];
      for (const storeName of stores) {
        if (data[storeName] && Array.isArray(data[storeName])) {
          const transaction = this.db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          
          // Clear current store
          await new Promise((res) => {
            const req = store.clear();
            req.onsuccess = () => res();
          });

          // Insert new items
          for (const item of data[storeName]) {
            await new Promise((res, rej) => {
              const req = store.put(item);
              req.onsuccess = () => res();
              req.onerror = () => rej(req.error);
            });
          }
        }
      }
      return true;
    } catch (e) {
      throw new Error('Archivo de copia de seguridad inválido: ' + e.message);
    }
  }

  // Export to CSV for Excel
  async downloadCSV(storeName) {
    const data = await this.getAll(storeName);
    if (!data.length) {
      alert('No hay datos para exportar en esta sección.');
      return;
    }

    let headers = Object.keys(data[0]);
    // Format JSON objects or sub-arrays nicely for CSV cell
    let csvRows = data.map(row => {
      return headers.map(fieldName => {
        let value = row[fieldName];
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Escape quotes
        let stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
    });

    // Add BOM for Excel UTF-8 display
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daza_${storeName}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Export singleton instance
const db = new DazaDB();
