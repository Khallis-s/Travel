const { ipcRenderer } = require('electron');

// Add this at the top of your file to check if the API is available
console.log('Checking Electron API availability:', {
    hasWindow: typeof window !== 'undefined',
    hasElectronAPI: typeof window.electronAPI !== 'undefined',
    apis: window.electronAPI ? Object.keys(window.electronAPI) : []
});

function showNewItineraryForm() {
    console.log('Showing new itinerary form'); // Debug log
    
    // Show the form
    const form = document.getElementById('itineraryForm');
    if (form) {
        form.style.display = 'block';
        
        // Reset the form
        const newItineraryForm = document.getElementById('newItineraryForm');
        if (newItineraryForm) {
            newItineraryForm.reset();
            newItineraryForm.dataset.editId = ''; // Clear any existing edit ID
        }

        // Clear activities list and add one empty activity input
        const activitiesList = document.getElementById('activitiesList');
        if (activitiesList) {
            activitiesList.innerHTML = '';
            addActivityInput();
        }
    }
}

function closeItineraryForm() {
    console.log('Closing itinerary form'); // Debug log
    
    const form = document.getElementById('itineraryForm');
    if (form) {
        form.style.display = 'none';
        
        // Reset the form
        const newItineraryForm = document.getElementById('newItineraryForm');
        if (newItineraryForm) {
            newItineraryForm.reset();
            newItineraryForm.dataset.editId = '';
        }
    }
}

function addActivityInput() {
    console.log('Adding new activity input'); // Debug log
    
    const activitiesList = document.getElementById('activitiesList');
    if (activitiesList) {
        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-input';
        activityDiv.innerHTML = `
            <input type="time" class="activity-time" required>
            <input type="text" class="activity-description" placeholder="Activity description" required>
            <button type="button" onclick="removeActivity(this)" class="remove-activity">
                <i class="fas fa-minus-circle"></i>
            </button>
        `;
        activitiesList.appendChild(activityDiv);
    }
}

function removeActivity(button) {
    console.log('Removing activity'); // Debug log
    
    const activityDiv = button.parentElement;
    if (activityDiv) {
        activityDiv.remove();
        
        // If no activities left, add one empty input
        const activitiesList = document.getElementById('activitiesList');
        if (activitiesList && activitiesList.children.length === 0) {
            addActivityInput();
        }
    }
}

function showModal(message, type = 'success') {
    // Remove any existing modal
    const existingModal = document.getElementById('customModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'customModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content ${type}-modal">
            <span class="close" onclick="closeModal()">&times;</span>
            <div class="modal-body">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <p>${message}</p>
            </div>
            <button onclick="closeModal()" class="modal-button ${type}-button">OK</button>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Auto close after 3 seconds
    setTimeout(() => {
        closeModal();
    }, 3000);
}

function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.remove();
    }
}

async function saveItinerary(event) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('newItineraryForm');
        const isEditing = form.dataset.editId; // Get the ID if we're editing
        console.log('Is editing:', isEditing); // Debug log
        
        // Get the original location if editing
        let originalLocation = '';
        if (isEditing) {
            const existingCard = document.querySelector(`.itinerary-card[data-id="${isEditing}"]`);
            if (existingCard) {
                const existingData = JSON.parse(existingCard.dataset.itineraryData);
                originalLocation = existingData.location;
            }
        }

        // Gather form data
        const location = document.getElementById('location').value;
        const date = document.getElementById('date').value;
        const notes = document.getElementById('notes').value;

        // Get activities
        const activities = [];
        document.querySelectorAll('.activity-input').forEach(input => {
            activities.push({
                time: input.querySelector('.activity-time').value,
                description: input.querySelector('.activity-description').value
            });
        });

        // Get weather data
        let weatherData;
        try {
            weatherData = await getCurrentWeather(location);
        } catch (weatherError) {
            console.warn('Weather data fetch failed:', weatherError);
            weatherData = null;
        }

        // Prepare itinerary data
        const itineraryData = {
            id: isEditing || Date.now().toString(), // Use existing ID if editing
            location: location,
            date: date,
            weather: weatherData ? {
                temp: weatherData.current?.temp_c || 'N/A',
                condition: weatherData.current?.condition?.text || 'N/A',
                forecast: weatherData.forecast?.forecastday?.[0]?.day?.avgtemp_c 
                    ? `${weatherData.forecast.forecastday[0].day.avgtemp_c}°C average`
                    : 'N/A'
            } : 'Weather data unavailable',
            activities: activities,
            notes: notes || 'No notes added',
            createdAt: form.dataset.createdAt || new Date().toISOString(),
            originalLocation: originalLocation // Add this for update handling
        };

        console.log('Saving itinerary data:', itineraryData); // Debug log

        // Save the itinerary
        const result = await ipcRenderer.invoke('save-itinerary', {
            ...itineraryData,
            isEditing: !!isEditing,
            originalLocation: originalLocation
        });
        
        if (result.success) {
            // Remove existing card if updating
            if (isEditing) {
                const existingCard = document.querySelector(`.itinerary-card[data-id="${isEditing}"]`);
                if (existingCard) {
                    existingCard.remove();
                }
            }

            // Display the new/updated itinerary
            displayItinerary(itineraryData);
            
            // Show success modal instead of alert
            showModal(isEditing ? 'Itinerary updated successfully!' : 'Itinerary saved successfully!', 'success');
            
            // Reset form and close it
            form.reset();
            form.dataset.editId = '';
            form.dataset.createdAt = '';
            closeItineraryForm();
        } else {
            throw new Error(result.error || 'Failed to save itinerary');
        }
    } catch (error) {
        console.error('Error saving itinerary:', error);
        showModal('Error saving itinerary: ' + error.message, 'error');
    }
}

// Add this confirmation modal function
function showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content confirm-modal">
            <span class="close" onclick="closeConfirmModal()">&times;</span>
            <div class="modal-body">
                <i class="fas fa-question-circle"></i>
                <p>${message}</p>
            </div>
            <div class="modal-buttons">
                <button onclick="closeConfirmModal()" class="modal-button cancel-button">Cancel</button>
                <button id="confirmButton" class="modal-button confirm-button">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Add confirm action
    document.getElementById('confirmButton').onclick = () => {
        closeConfirmModal();
        onConfirm();
    };
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.remove();
    }
}

// Update the deleteItinerary function
async function deleteItinerary(itineraryId) {
    try {
        if (!ipcRenderer) {
            throw new Error('IPC Renderer not initialized');
        }

        if (!itineraryId) {
            throw new Error('Invalid itinerary ID');
        }

        showConfirmModal('Are you sure you want to delete this itinerary?', async () => {
            try {
                // Get the itinerary data first
                const getResult = await ipcRenderer.invoke('get-itinerary', itineraryId);
                if (!getResult.success) {
                    throw new Error('Failed to find itinerary');
                }

                // Parse the content to get the location
                const itinerary = parseItineraryContent(getResult.data);
                
                // Now delete with both id and location
                const deleteResult = await ipcRenderer.invoke('delete-itinerary', {
                    id: itineraryId,
                    location: itinerary.location
                });
                
                if (!deleteResult.success) {
                    throw new Error(deleteResult.error || 'Failed to delete itinerary');
                }
                
                const card = document.querySelector(`.itinerary-card[data-id="${itineraryId}"]`);
                if (card) {
                    card.remove();
                    showModal('Itinerary deleted successfully', 'success');
                }
            } catch (error) {
                console.error('Error deleting itinerary:', error);
                showModal('Error deleting itinerary: ' + error.message, 'error');
            }
        });
    } catch (error) {
        console.error('Error in delete process:', error);
        showModal('Error: ' + error.message, 'error');
    }
}

// Add this function to refresh the itineraries display
function displayItineraries(itineraries) {
    const container = document.getElementById('itinerariesContainer');
    if (!container) return;

    container.innerHTML = ''; // Clear existing content
    
    if (Array.isArray(itineraries) && itineraries.length > 0) {
        itineraries.forEach(itinerary => {
            displayItinerary(itinerary);
        });
    } else {
        container.innerHTML = '<p>No itineraries found</p>';
    }
}

async function editItinerary(itineraryId) {
    try {
        console.log('Starting edit for itinerary:', itineraryId);

        // Get the card element
        const card = document.querySelector(`.itinerary-card[data-id="${itineraryId}"]`);
        if (!card) {
            throw new Error('Itinerary card not found');
        }

        // Get the stored data
        const itineraryData = JSON.parse(card.dataset.itineraryData);
        console.log('Retrieved itinerary data:', itineraryData);

        // Show and populate the form
        const form = document.getElementById('itineraryForm');
        form.style.display = 'block';

        // Set form data
        const newItineraryForm = document.getElementById('newItineraryForm');
        newItineraryForm.dataset.editId = itineraryId; // Set the edit ID
        
        // Populate basic fields
        document.getElementById('location').value = itineraryData.location || '';
        document.getElementById('date').value = itineraryData.date || '';
        document.getElementById('notes').value = itineraryData.notes || '';

        // Handle activities
        const activitiesList = document.getElementById('activitiesList');
        activitiesList.innerHTML = ''; // Clear existing activities

        if (itineraryData.activities && Array.isArray(itineraryData.activities)) {
            itineraryData.activities.forEach(activity => {
                const activityDiv = document.createElement('div');
                activityDiv.className = 'activity-input';
                activityDiv.innerHTML = `
                    <input type="time" class="activity-time" value="${activity.time || ''}" required>
                    <input type="text" class="activity-description" value="${activity.description || ''}" required>
                    <button type="button" onclick="removeActivity(this)" class="remove-activity">
                        <i class="fas fa-minus-circle"></i>
                    </button>
                `;
                activitiesList.appendChild(activityDiv);
            });
        } else {
            addActivityInput(); // Add one empty activity if none exist
        }

        console.log('Form populated successfully');
    } catch (error) {
        console.error('Error editing itinerary:', error);
        showModal('Error editing itinerary: ' + error.message, 'error');
    }
}

// Helper function to parse itinerary content
function parseItineraryContent(content) {
    try {
        const lines = content.split('\n');
        const itinerary = {};
        
        // Parse basic information
        itinerary.location = lines.find(line => line.startsWith('Destination:'))?.split(':')[1]?.trim();
        itinerary.date = lines.find(line => line.startsWith('Date:'))?.split(':')[1]?.trim();
        
        // Parse activities
        const activitiesStartIndex = lines.findIndex(line => line.includes('Activities')) + 2;
        const activitiesEndIndex = lines.findIndex((line, index) => index > activitiesStartIndex && line.includes('Notes'));
        
        const activitiesLines = lines.slice(activitiesStartIndex, activitiesEndIndex).filter(line => line.trim());
        itinerary.activities = activitiesLines.map(line => {
            const [time, ...descParts] = line.split('-').map(part => part.trim());
            return {
                time: time,
                description: descParts.join('-')
            };
        });

        // Parse notes
        const notesStartIndex = lines.findIndex(line => line.includes('Notes')) + 2;
        const notesEndIndex = lines.findIndex((line, index) => index > notesStartIndex && line.includes('Last Updated'));
        itinerary.notes = lines.slice(notesStartIndex, notesEndIndex).filter(line => line.trim()).join('\n');

        return itinerary;
    } catch (error) {
        console.error('Error parsing itinerary content:', error);
        return {
            location: '',
            date: '',
            activities: [],
            notes: ''
        };
    }
}

function displayItinerary(itinerary) {
    const container = document.getElementById('itinerariesContainer');
    const card = document.createElement('div');
    card.className = 'itinerary-card';
    card.dataset.id = itinerary.id;
    card.dataset.itineraryData = JSON.stringify(itinerary);

    // Format the date
    const formattedDate = new Date(itinerary.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    card.innerHTML = `
        <div class="itinerary-header">
            <h3>${itinerary.location}</h3>
            <div class="itinerary-actions">
                <button onclick="editItinerary('${itinerary.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteItinerary('${itinerary.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="itinerary-date">${formattedDate}</div>

        <div class="itinerary-activities">
            <h4>Activities:</h4>
            <ul>
                ${itinerary.activities.map(activity => `
                    <li>
                        <span class="activity-time">${activity.time}</span>
                        <span class="activity-description">${activity.description}</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        ${itinerary.notes ? `
            <div class="itinerary-notes">
                <h4>Notes:</h4>
                <p>${itinerary.notes}</p>
            </div>
        ` : ''}

        <div class="itinerary-footer">
            <button onclick="readItineraryFile('${itinerary.id}')" class="action-button">
                <i class="fas fa-file-alt"></i> Read TXT
            </button>
        </div>
    `;

    container.appendChild(card);
}

// Update the getCurrentWeather function
async function getCurrentWeather(location) {
    try {
        // Use ipcRenderer to request weather data from main process
        const weatherData = await ipcRenderer.invoke('update-location', location);
        console.log('Weather data received:', weatherData); // Debug log
        
        if (!weatherData || weatherData.error) {
            throw new Error(weatherData?.error?.message || 'Failed to fetch weather data');
        }
        
        return weatherData;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

// Add these new functions
async function readItineraryFile(itineraryId) {
    try {
        console.log('Reading itinerary with ID:', itineraryId);
        
        // Get the itinerary card
        const card = document.querySelector(`.itinerary-card[data-id="${itineraryId}"]`);
        if (!card) {
            throw new Error('Itinerary card not found');
        }

        // Get the data from the card
        const location = card.querySelector('h3').textContent;
        const date = card.querySelector('.itinerary-date').textContent;
        
        // Get activities
        const activities = [];
        card.querySelectorAll('.itinerary-activities li').forEach(li => {
            const time = li.querySelector('.activity-time').textContent;
            const description = li.querySelector('.activity-description').textContent;
            activities.push({ time, description });
        });

        // Get notes
        const notesElement = card.querySelector('.itinerary-notes p');
        const notes = notesElement ? notesElement.textContent : '';

        // Create formatted content
        const content = `
Destination: ${location}
Date: ${date}

Activities:
${activities.map(activity => `${activity.time} - ${activity.description}`).join('\n')}

Notes:
${notes || 'No notes'}
        `.trim();

        // Show the modal with content
        const modal = document.getElementById('txtModal') || createModal();
        const contentDiv = document.getElementById('txtContent');
        
        contentDiv.innerHTML = `
            <div class="txt-file-item">
                <div class="txt-file-header">
                    <h3>Itinerary for ${location}</h3>
                    <span class="txt-file-date">Created: ${new Date().toLocaleString()}</span>
                </div>
                <pre class="txt-file-content">${content}</pre>
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error reading itinerary:', error);
        showError('Error reading itinerary: ' + error.message);
    }
}

function createModal() {
    const modalHtml = `
        <div id="txtModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Itinerary Details</h2>
                    <span class="close-modal" onclick="closeTxtModal()">&times;</span>
                </div>
                <div id="txtContent" class="modal-body">
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    return document.getElementById('txtModal');
}

function showError(message) {
    const modal = document.getElementById('txtModal') || createModal();
    const contentDiv = document.getElementById('txtContent');
    
    contentDiv.innerHTML = `
        <div class="error-message">
            ${message}
        </div>
    `;
    modal.style.display = 'block';
}

function closeTxtModal() {
    const modal = document.getElementById('txtModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function downloadItineraryTxt(itineraryId) {
    try {
        const result = await ipcRenderer.invoke('download-itinerary', itineraryId);
        if (!result.success) {
            throw new Error(result.error || 'Failed to download itinerary');
        }
        alert('Itinerary downloaded successfully!');
    } catch (error) {
        console.error('Error downloading itinerary:', error);
        alert('Error downloading itinerary: ' + error.message);
    }
}

// Make sure these are available globally
window.deleteItinerary = deleteItinerary;
window.editItinerary = editItinerary;
window.parseItineraryContent = parseItineraryContent;
window.addActivityInput = addActivityInput;
window.removeActivity = removeActivity;
window.saveItinerary = saveItinerary;
window.showNewItineraryForm = showNewItineraryForm;
window.closeItineraryForm = closeItineraryForm;
window.displayItinerary = displayItinerary;
window.getCurrentWeather = getCurrentWeather;
window.readItineraryFile = readItineraryFile;
window.downloadItineraryTxt = downloadItineraryTxt;
window.closeTxtModal = closeTxtModal;
window.closeModal = closeModal;
window.closeConfirmModal = closeConfirmModal;

// Make sure the form is set up when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, Electron API status:', {
        available: typeof window.electronAPI !== 'undefined',
        apis: window.electronAPI ? Object.keys(window.electronAPI) : []
    });
    
    // Set up form submit handler
    const form = document.getElementById('newItineraryForm');
    if (form) {
        form.addEventListener('submit', saveItinerary);
    }
    
    // Add initial activity input
    addActivityInput();
});

// Add this function to dynamically load tips based on location
function loadLocationSpecificTips(location) {
    const tipsData = {
        'beach': [
            { icon: 'umbrella-beach', title: 'Beach Safety', content: 'Check tide times and swim in designated areas' },
            { icon: 'sun', title: 'Sun Protection', content: 'Apply sunscreen regularly and stay hydrated' }
        ],
        'city': [
            { icon: 'subway', title: 'Public Transport', content: 'Get a local transport card for better rates' },
            { icon: 'walking', title: 'Walking Tours', content: 'Join free walking tours to explore the city' }
        ],
        'mountain': [
            { icon: 'mountain', title: 'Altitude Tips', content: 'Acclimatize gradually and stay hydrated' },
            { icon: 'hiking', title: 'Trail Safety', content: 'Check weather conditions before hiking' }
        ]
    };

    // Function to render tips
    function renderTips(tips) {
        const tipsContainer = document.querySelector('.tips-container');
        tipsContainer.innerHTML = tips.map((tip, index) => `
            <div class="tip-card" style="--card-index: ${index}">
                <div class="tip-icon">
                    <i class="fas fa-${tip.icon}"></i>
                </div>
                <h3>${tip.title}</h3>
                <p>${tip.content}</p>
            </div>
        `).join('');
    }

    // Load appropriate tips based on location type
    // This is a simple example - you could expand this with an API call
    const locationType = determineLocationType(location);
    renderTips(tipsData[locationType] || tipsData['city']);
}

// Helper function to determine location type
function determineLocationType(location) {
    // This could be enhanced with an API call or more sophisticated logic
    const beachKeywords = ['beach', 'coast', 'sea'];
    const mountainKeywords = ['mountain', 'hill', 'peak'];
    
    location = location.toLowerCase();
    
    if (beachKeywords.some(keyword => location.includes(keyword))) return 'beach';
    if (mountainKeywords.some(keyword => location.includes(keyword))) return 'mountain';
    return 'city';
}

function handleLocationUpdate(location) {
    // Handle location updates locally instead
    console.log('Location updated:', location);
    // Add any necessary local handling
}