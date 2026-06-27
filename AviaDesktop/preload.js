const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('aviaDesktop', {
  platform: process.platform,
  targetUrl: process.env.TARGET_URL || 'http://localhost:8091',
})
