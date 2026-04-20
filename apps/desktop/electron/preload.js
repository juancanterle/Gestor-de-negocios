const { contextBridge, ipcRenderer } = require('electron')

const api = {
  auth: {
    login:     (d)  => ipcRenderer.invoke('auth:login', d),
    current:   ()   => ipcRenderer.invoke('auth:current'),
    logout:    ()   => ipcRenderer.invoke('auth:logout'),
    touch:     ()   => ipcRenderer.invoke('auth:touch'),
  },

  store:        { get:    ()  => ipcRenderer.invoke('store:get'),
                  update: (d) => ipcRenderer.invoke('store:update', d) },

  users:        { login:     (d) => ipcRenderer.invoke('users:login', d),
                  list:      ()  => ipcRenderer.invoke('users:list'),
                  create:    (d) => ipcRenderer.invoke('users:create', d),
                  changePin: (d) => ipcRenderer.invoke('users:changePin', d) },

  categories:   { list:   ()  => ipcRenderer.invoke('categories:list'),
                  create: (d) => ipcRenderer.invoke('categories:create', d),
                  update: (d) => ipcRenderer.invoke('categories:update', d),
                  delete: (id)=> ipcRenderer.invoke('categories:delete', id) },

  suppliers:    { list:   ()  => ipcRenderer.invoke('suppliers:list'),
                  create: (d) => ipcRenderer.invoke('suppliers:create', d),
                  update: (d) => ipcRenderer.invoke('suppliers:update', d),
                  delete: (id)=> ipcRenderer.invoke('suppliers:delete', id) },

  products:     { list:         (f) => ipcRenderer.invoke('products:list', f),
                  getByBarcode: (b) => ipcRenderer.invoke('products:getByBarcode', b),
                  create:       (d) => ipcRenderer.invoke('products:create', d),
                  update:       (d) => ipcRenderer.invoke('products:update', d),
                  delete:       (id)=> ipcRenderer.invoke('products:delete', id) },

  sales:        { create:   (d) => ipcRenderer.invoke('sales:create', d),
                  list:     (f) => ipcRenderer.invoke('sales:list', f),
                  getItems: (id)=> ipcRenderer.invoke('sales:getItems', id) },

  cashRegister: { open:         (d) => ipcRenderer.invoke('cashRegister:open', d),
                  getCurrent:   ()  => ipcRenderer.invoke('cashRegister:getCurrent'),
                  close:        (d) => ipcRenderer.invoke('cashRegister:close', d),
                  addMovement:  (d) => ipcRenderer.invoke('cashRegister:addMovement', d),
                  getMovements: (id)=> ipcRenderer.invoke('cashRegister:getMovements', id) },

  purchases:    { create: (d) => ipcRenderer.invoke('purchases:create', d),
                  list:   ()  => ipcRenderer.invoke('purchases:list') },

  reports:      { salesSummary: (f) => ipcRenderer.invoke('reports:salesSummary', f),
                  salesByDay:   (f) => ipcRenderer.invoke('reports:salesByDay', f) },

  app:          { getVersion:   ()  => ipcRenderer.invoke('app:getVersion'),
                  checkUpdates: ()  => ipcRenderer.invoke('app:checkUpdates') },

  sync:         { manual:       ()  => ipcRenderer.invoke('sync:manual'),
                  status:       ()  => ipcRenderer.invoke('sync:status') },

  print:        { ticket:       (d) => ipcRenderer.invoke('print:ticket', d),
                  reprint:      (d) => ipcRenderer.invoke('print:reprint', d) },

  backup:       { create:       (d) => ipcRenderer.invoke('backup:create', d) },

  exporter:     { csv:          (d) => ipcRenderer.invoke('export:csv', d) },
}

contextBridge.exposeInMainWorld('api', api)
