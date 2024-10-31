const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

// Add these IPC handlers at the top level, before createWindow
ipcMain.handle('read-itinerary-file', async (event, itineraryId) => {
    console.log('Reading itinerary file for ID:', itineraryId);
    try {
        // Get the card element with the itinerary data
        const itineraryData = await event.sender.executeJavaScript(`
            document.querySelector('.itinerary-card[data-id="${itineraryId}"]').dataset.itineraryData
        `);
        
        if (!itineraryData) {
            throw new Error('Itinerary data not found');
        }

        const data = JSON.parse(itineraryData);
        
        // Format the content
        const content = `
Destination: ${data.location}
Date: ${data.date}

Activities:
${data.activities.map(activity => `${activity.time} - ${activity.description}`).join('\n')}

Notes:
${data.notes || 'No notes'}
        `.trim();

        return {
            success: true,
            fileName: `Itinerary_${data.location}.txt`,
            content: content,
            modifiedTime: new Date()
        };
    } catch (error) {
        console.error('Error in read-itinerary-file:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Add this handler BEFORE createWindow
ipcMain.handle('read-itineraries', async () => {
    try {
        const customPath = path.join(app.getPath('userData'), 'itineraries');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(customPath)) {
            fs.mkdirSync(customPath, { recursive: true });
            return { success: true, files: [] };
        }

        // Read all files in the directory
        const files = fs.readdirSync(customPath)
            .filter(file => file.endsWith('.txt'))
            .map(fileName => {
                const filePath = path.join(customPath, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                return { fileName, content };
            });

        return { success: true, files };
    } catch (error) {
        console.error('Error reading itineraries:', error);
        return { success: false, error: error.message };
    }
});

// Update the save-itinerary handler
ipcMain.handle('save-itinerary', async (event, itineraryData) => {
    try {
        const { isEditing, originalLocation, ...data } = itineraryData;
        
        if (isEditing) {
            // If location changed, delete the old file
            if (originalLocation && originalLocation !== data.location) {
                const oldFilePath = path.join(itinerariesDir, `${originalLocation}.txt`);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        }

        // Save the new/updated file
        const filePath = path.join(itinerariesDir, `${data.location}.txt`);
        const content = formatItineraryContent(data); // Your existing formatting function
        fs.writeFileSync(filePath, content, 'utf8');

        return { success: true };
    } catch (error) {
        console.error('Error saving itinerary:', error);
        return { success: false, error: error.message };
    }
});

// Add this to your main.js
ipcMain.handle('get-advisories', async (event, location) => {
    try {
        console.log('Fetching advisories for:', location);
        
        const API_KEY = '32804b24a847407391c53709241010'; // Your WeatherAPI key
        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${location}&days=3&alerts=yes`
        );

        if (!response.ok) {
            throw new Error('Weather API request failed');
        }

        const data = await response.json();
        
        // Generate clothing and activity recommendations based on weather
        const recommendations = generateRecommendations(data.current, data.forecast);

        return {
            success: true,
            data: {
                location: data.location,
                current: data.current,
                forecast: data.forecast,
                alerts: data.alerts?.alert || [],
                recommendations
            }
        };
    } catch (error) {
        console.error('Error fetching advisories:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

function generateRecommendations(current, forecast) {
    const temp = current.temp_c;
    const condition = current.condition.text.toLowerCase();
    const isRaining = condition.includes('rain') || condition.includes('drizzle');
    const isSnowing = condition.includes('snow') || condition.includes('sleet');
    const isHot = temp >= 25;
    const isCold = temp <= 10;

    const recommendations = {
        clothing: [],
        activities: [],
        precautions: []
    };

    // Clothing recommendations
    if (isHot) {
        recommendations.clothing.push(
            'Light, breathable clothing',
            'Sun hat',
            'Sunglasses',
            'Light colored clothes'
        );
    } else if (isCold) {
        recommendations.clothing.push(
            'Warm jacket',
            'Layers of clothing',
            'Gloves',
            'Warm hat',
            'Scarf'
        );
    } else {
        recommendations.clothing.push(
            'Light jacket or sweater',
            'Comfortable clothing'
        );
    }

    if (isRaining) {
        recommendations.clothing.push(
            'Rain jacket or umbrella',
            'Waterproof shoes'
        );
    }

    if (isSnowing) {
        recommendations.clothing.push(
            'Snow boots',
            'Waterproof winter coat',
            'Thermal underwear'
        );
    }

    // Activity recommendations
    if (isHot) {
        recommendations.activities.push(
            'Indoor activities during peak heat',
            'Swimming',
            'Early morning or evening outdoor activities'
        );
    } else if (isCold || isRaining || isSnowing) {
        recommendations.activities.push(
            'Indoor attractions',
            'Museums and galleries',
            'Shopping centers'
        );
    } else {
        recommendations.activities.push(
            'Outdoor sightseeing',
            'Parks and gardens',
            'Walking tours'
        );
    }

    // Precautions
    if (isHot) {
        recommendations.precautions.push(
            'Stay hydrated',
            'Use sunscreen',
            'Avoid prolonged sun exposure'
        );
    }
    if (isCold) {
        recommendations.precautions.push(
            'Stay warm',
            'Watch for ice',
            'Limit time outdoors'
        );
    }
    if (isRaining) {
        recommendations.precautions.push(
            'Check for flood warnings',
            'Be careful on wet surfaces'
        );
    }

    return recommendations;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true, // Enable context isolation
            preload: path.join(__dirname, 'preload.js') // Add preload script
        }
    });

    mainWindow.loadFile('src/pages/index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('download-itinerary', async (event, itineraryId) => {
    try {
        const itinerariesPath = path.join(__dirname, '../itineraries');
        const files = await fs.readdir(itinerariesPath);
        
        const itineraryFile = files.find(file => file.includes(itineraryId));
        if (!itineraryFile) {
            throw new Error('Itinerary file not found');
        }

        const filePath = path.join(itinerariesPath, itineraryFile);
        const downloadPath = path.join(app.getPath('downloads'), itineraryFile);
        
        await fs.copyFile(filePath, downloadPath);

        return {
            success: true,
            downloadPath
        };
    } catch (error) {
        console.error('Error downloading itinerary:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

