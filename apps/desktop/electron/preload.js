const { contextBridge, ipcRenderer } = require('electron')

async function ipc(channel, data) {
  try {
    const result = await ipcRenderer.invoke(channel, data)
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Error desconocido' }
  }
}

const api = {
  // Store
  store: {
    get:    ()  => ipc('store:get'),
    update: (d) => ipc('store:update', d),
  },

  // Auth
  users: {
    login:  (d) => ipc('users:login', d),
    list:   ()  => ipc('users:list'),
    create: (d) => ipc('users:create', d),
  },

  // Catálogo
  categories: {
    list:   ()   => ipc('categories:list'),
    create: (d)  => ipc('categories:create', d),
    update: (d)  => ipc('categories:update', d),
    delete: (id) => ipc('categories:delete', id),
  },

  suppliers: {
    list:   ()   => ipc('suppliers:list'),
    create: (d)  => ipc('suppliers:create', d),
    update: (d)  => ipc('suppliers:update', d),
    delete: (id) => ipc('suppliers:delete', id),
  },

  products: {
    list:         (f)  => ipc('products:list', f),
    getByBarcode: (b)  => ipc('products:getByBarcode', b),
    create:       (d)  => ipc('products:create', d),
    update:       (d)  => ipc('products:update', d),
    delete:       (id) => ipc('products:delete', id),
  },

  // POS
  sales: {
    create:   (d)  => ipc('sales:create', d),
    list:     (f)  => ipc('sales:list', f),
    getItems: (id) => ipc('sales:getItems', id),
  },

  // Caja
  cashRegister: {
    open:         (d)  => ipc('cashRegister:open', d),
    getCurrent:   ()   => ipc('cashRegister:getCurrent'),
    close:        (d)  => ipc('cashRegister:close', d),
    addMovement:  (d)  => ipc('cashRegister:addMovement', d),
    getMovements: (id) => ipc('cashRegister:getMovements', id),
  },

  // Compras
  purchases: {
    create: (d) => ipc('purchases:create', d),
    list:   ()  => ipc('purchases:list'),
  },

  // Reportes
  reports: {
    salesSummary: (f) => ipc('reports:salesSummary', f),
    salesByDay:   (f) => ipc('reports:salesByDay', f),
  },

  // Sincronización
  sync: {
    status: ()  => ipc('sync:status'),
    manual: ()  => ipc('sync:manual'),
  },
}

contextBridge.exposeInMainWorld('api', api)
