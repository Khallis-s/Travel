const { contextBridge, ipcRenderer } = require('electron');

// Make sure this file is properly loaded
console.log('Preload script is running');

contextBridge.exposeInMainWorld('electronAPI', {
    saveItinerary: (data) => ipcRenderer.invoke('save-itinerary', data),
    deleteItinerary: (data) => ipcRenderer.invoke('delete-itinerary', data),
    getItinerary: (id) => ipcRenderer.invoke('get-itinerary', id),
    getAllItineraries: () => ipcRenderer.invoke('get-all-itineraries'),
    getCurrentWeather: (location) => ipcRenderer.invoke('get-weather', location),
    loadPage: (page) => ipcRenderer.send('load-page', page),
    readItineraryFile: (itineraryId) => ipcRenderer.invoke('read-itinerary-file', itineraryId),
    downloadItinerary: (itineraryId) => ipcRenderer.invoke('download-itinerary', itineraryId)
});
