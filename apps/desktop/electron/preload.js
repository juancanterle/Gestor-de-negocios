const { contextBridge, ipcRenderer } = require('electron')

const api = {
  // Store
  store:         { get: () => ipcRenderer.invoke('store:get'),
                   update: (d) => ipcRenderer.invoke('store:update', d) },

  // Auth
  users:         { login:  (d) => ipcRenderer.invoke('users:login', d),
                   list:   ()  => ipcRenderer.invoke('users:list'),
                   create: (d) => ipcRenderer.invoke('users:create', d) },

  // Catálogo
  categories:    { list:   ()  => ipcRenderer.invoke('categories:list'),
                   create: (d) => ipcRenderer.invoke('categories:create', d),
                   update: (d) => ipcRenderer.invoke('categories:update', d),
                   delete: (id)=> ipcRenderer.invoke('categories:delete', id) },

  suppliers:     { list:   ()  => ipcRenderer.invoke('suppliers:list'),
                   create: (d) => ipcRenderer.invoke('suppliers:create', d),
                   update: (d) => ipcRenderer.invoke('suppliers:update', d),
                   delete: (id)=> ipcRenderer.invoke('suppliers:delete', id) },

  products:      { list:         (f) => ipcRenderer.invoke('products:list', f),
                   getByBarcode: (b) => ipcRenderer.invoke('products:getByBarcode', b),
                   create:       (d) => ipcRenderer.invoke('products:create', d),
                   update:       (d) => ipcRenderer.invoke('products:update', d),
                   delete:       (id)=> ipcRenderer.invoke('products:delete', id) },

  // POS
  sales:         { create:   (d) => ipcRenderer.invoke('sales:create', d),
                   list:     (f) => ipcRenderer.invoke('sales:list', f),
                   getItems: (id)=> ipcRenderer.invoke('sales:getItems', id) },

  // Caja
  cashRegister:  { open:         (d) => ipcRenderer.invoke('cashRegister:open', d),
                   getCurrent:   ()  => ipcRenderer.invoke('cashRegister:getCurrent'),
                   close:        (d) => ipcRenderer.invoke('cashRegister:close', d),
                   addMovement:  (d) => ipcRenderer.invoke('cashRegister:addMovement', d),
                   getMovements: (id)=> ipcRenderer.invoke('cashRegister:getMovements', id) },

  // Compras
  purchases:     { create: (d) => ipcRenderer.invoke('purchases:create', d),
                   list:   ()  => ipcRenderer.invoke('purchases:list') },

  // Reportes
  reports:       { salesSummary: (f) => ipcRenderer.invoke('reports:salesSummary', f),
                   salesByDay:   (f) => ipcRenderer.invoke('reports:salesByDay', f) },
}

contextBridge.exposeInMainWorld('api', api)
