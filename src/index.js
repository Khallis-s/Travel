const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let splashWindow;

const createWindow = async () => {
  // Create the splash window
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load splash screen
  await splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  // Create the main window with improved preferences
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Load the main window content
  await mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Import fetch for weather API
  const fetch = (await import('node-fetch')).default;
  const API_KEY = '32804b24a847407391c53709241010';

  // Weather API handler
  ipcMain.on('update-location', async (event, location) => {
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${location}&days=3&aqi=no&alerts=no`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      
      const data = await response.json();
      event.reply('weather-data', data);
    } catch (error) {
      console.error('Weather API error:', error);
      event.reply('weather-data', { error: { message: error.message } });
    }
  });

  // Page navigation handler
  ipcMain.on('load-page', (event, page) => {
    const pages = {
      'index': 'index.html',
      'advisories': 'advisories.html',
      'itineraries': 'itineraries.html'
    };
    if (pages[page]) {
      mainWindow.loadFile(path.join(__dirname, pages[page]));
    }
  });

  // Enhanced itinerary save handler
  ipcMain.handle('save-itinerary', async (event, itineraryData) => {
    try {
      const customPath = path.join(__dirname, '../itineraries');
      await fs.mkdir(customPath, { recursive: true });

      // Use the existing ID if it's an update, otherwise create new ID
      const id = itineraryData.id || Date.now().toString();
      const sanitizedLocation = itineraryData.location.replace(/[^a-z0-9]/gi, '_');
      const fileName = `${sanitizedLocation}_${id}.txt`;
      const filePath = path.join(customPath, fileName);

      // Check if we're updating an existing file
      const files = await fs.readdir(customPath);
      const existingFile = files.find(file => file.includes(id));
      
      if (existingFile && existingFile !== fileName) {
        // Delete the old file if location was changed
        await fs.unlink(path.join(customPath, existingFile));
      }

      // Create formatted content with weather information
      const content = `Travel Itinerary
=================

Destination: ${itineraryData.location}
Date: ${itineraryData.date}

Weather Information
------------------
Temperature: ${itineraryData.weather?.temp || 'N/A'}°C
Condition: ${itineraryData.weather?.condition || 'N/A'}
Forecast: ${itineraryData.weather?.forecast || 'N/A'}

Activities
---------
${itineraryData.activities.map(activity => 
    `${activity.time} - ${activity.description}`
).join('\n')}

Notes
-----
${itineraryData.notes || 'No notes added'}

Last Updated: ${new Date().toLocaleString('en-GB')}
`;

      await fs.writeFile(filePath, content, 'utf8');
      return { 
        success: true, 
        fileName,
        filePath,
        id 
      };
    } catch (error) {
      console.error('Error saving itinerary:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  // New delete itinerary handler
  ipcMain.handle('delete-itinerary', async (event, itineraryData) => {
    try {
      const customPath = path.join(__dirname, '../itineraries');
      const sanitizedLocation = itineraryData.location.replace(/[^a-z0-9]/gi, '_');
      const fileName = `${sanitizedLocation}_${itineraryData.id}.txt`;
      const filePath = path.join(customPath, fileName);

      await fs.unlink(filePath);
      return {
        success: true,
        message: 'Itinerary deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Get itinerary handler
  ipcMain.handle('get-itinerary', async (event, id) => {
    try {
      const customPath = path.join(__dirname, '../itineraries');
      const files = await fs.readdir(customPath);
      const itineraryFile = files.find(file => file.includes(id));
      
      if (!itineraryFile) {
        throw new Error('Itinerary not found');
      }

      const content = await fs.readFile(path.join(customPath, itineraryFile), 'utf8');
      return {
        success: true,
        data: content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Show main window after splash
  setTimeout(() => {
    mainWindow.show();
    splashWindow.destroy();
  }, 2000);
};

// Create windows when app is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Recreate window when dock icon is clicked (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});