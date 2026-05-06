const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listProducts: () => ipcRenderer.invoke('products:list'),
  createProduct: (payload) => ipcRenderer.invoke('products:create', payload),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  moveStock: (payload) => ipcRenderer.invoke('stock:move', payload),
  stockHistory: () => ipcRenderer.invoke('stock:history')
});
