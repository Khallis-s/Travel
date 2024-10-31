const { app, ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

// Add these IPC handlers
ipcMain.handle('get-itineraries', async () => {
    try {
        const filePath = path.join(app.getPath('userData'), 'itineraries.json');
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    } catch (error) {
        console.error('Error reading itineraries:', error);
        throw error;
    }
});

ipcMain.handle('save-itinerary', async (event, itineraryData) => {
    try {
        const filePath = path.join(app.getPath('userData'), 'itineraries.json');
        let itineraries = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            itineraries = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
        
        itineraries.push(itineraryData);
        await fs.writeFile(filePath, JSON.stringify(itineraries, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving itinerary:', error);
        throw error;
    }
});

ipcMain.handle('update-itinerary', async (event, itineraryData) => {
    try {
        const filePath = path.join(app.getPath('userData'), 'itineraries.json');
        const data = await fs.readFile(filePath, 'utf8');
        let itineraries = JSON.parse(data);
        
        const index = itineraries.findIndex(i => i.id === itineraryData.id);
        if (index !== -1) {
            itineraries[index] = itineraryData;
            await fs.writeFile(filePath, JSON.stringify(itineraries, null, 2));
        }
        return true;
    } catch (error) {
        console.error('Error updating itinerary:', error);
        throw error;
    }
});

ipcMain.handle('delete-itinerary', async (event, id) => {
    try {
        const filePath = path.join(app.getPath('userData'), 'itineraries.json');
        const data = await fs.readFile(filePath, 'utf8');
        let itineraries = JSON.parse(data);
        
        itineraries = itineraries.filter(i => i.id !== id);
        await fs.writeFile(filePath, JSON.stringify(itineraries, null, 2));
        return true;
    } catch (error) {
        console.error('Error deleting itinerary:', error);
        throw error;
    }
}); 