let ipcRenderer;
try {
    const electron = require('electron');
    ipcRenderer = electron.ipcRenderer;
} catch (error) {
    console.error('Failed to load electron:', error);
}

// Add exit functions
function confirmExit() {
    console.log('Confirm exit clicked');
    const modal = document.getElementById('exitModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Exit modal not found');
    }
}

function closeExitModal() {
    console.log('Close modal clicked');
    const modal = document.getElementById('exitModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function exitApp() {
    console.log('Exit app clicked');
    if (ipcRenderer) {
        ipcRenderer.send('exit-app');
    }
}

// Add click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('exitModal');
    if (event.target === modal) {
        closeExitModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    const searchButton = document.getElementById('searchButton');
    const locationInput = document.getElementById('locationInput');
    const advisoriesContainer = document.getElementById('advisoriesContainer');
    const errorElement = document.getElementById('error');

    function loadDefaultAdvisory() {
        const defaultLocation = 'Kuala Lumpur';
        locationInput.value = defaultLocation;
        getAdvisories(defaultLocation);
    }

    function getClothingRecommendations(temp_c, condition) {
        const recommendations = [];
        
        // Base layer recommendations
        if (temp_c < 10) {
            recommendations.push('Thermal underwear');
            recommendations.push('Warm sweater or fleece');
            recommendations.push('Heavy winter coat');
        } else if (temp_c < 15) {
            recommendations.push('Light sweater or cardigan');
            recommendations.push('Light jacket');
        } else if (temp_c < 20) {
            recommendations.push('Long sleeve shirt');
            recommendations.push('Light windbreaker');
        } else {
            recommendations.push('T-shirt or short sleeve shirt');
            recommendations.push('Light clothing');
        }

        // Condition-based recommendations
        if (condition.includes('Rain') || condition.includes('Drizzle')) {
            recommendations.push('Waterproof jacket');
            recommendations.push('Waterproof shoes');
            recommendations.push('Umbrella');
        } else if (condition.includes('Snow')) {
            recommendations.push('Waterproof winter boots');
            recommendations.push('Warm socks');
            recommendations.push('Winter hat and gloves');
        } else if (condition.includes('Mist') || condition.includes('Fog')) {
            recommendations.push('Reflective gear if walking');
        }

        return recommendations;
    }

    function getActivityRecommendations(temp_c, condition) {
        const activities = [];
        
        // Temperature-based activities
        if (temp_c > 20) {
            activities.push('Perfect for outdoor sightseeing');
            activities.push('Outdoor dining recommended');
            activities.push('Park visits ideal');
        } else if (temp_c > 10) {
            activities.push('Comfortable for walking tours');
            activities.push('Mix of indoor and outdoor activities recommended');
        } else {
            activities.push('Indoor attractions recommended');
            activities.push('Museums and galleries ideal');
        }

        // Condition-based activities
        if (condition.includes('Clear') || condition.includes('Sunny')) {
            activities.push('Photography opportunities');
            activities.push('Outdoor markets and street exploring');
        } else if (condition.includes('Rain') || condition.includes('Drizzle')) {
            activities.push('Indoor shopping centers');
            activities.push('Visit local cafes and restaurants');
        }

        return activities;
    }

    function getPrecautions(temp_c, condition, humidity, wind_kph) {
        const precautions = [];

        // Temperature precautions
        if (temp_c > 25) {
            precautions.push('Stay hydrated');
            precautions.push('Use sunscreen');
            precautions.push('Seek shade during peak hours');
        } else if (temp_c < 5) {
            precautions.push('Risk of hypothermia - dress warmly');
            precautions.push('Limit time outdoors');
        }

        // Condition precautions
        if (condition.includes('Rain')) {
            precautions.push('Slippery surfaces - watch your step');
            precautions.push('Keep valuables waterproof');
        } else if (condition.includes('Mist') || condition.includes('Fog')) {
            precautions.push('Reduced visibility - take extra care when crossing roads');
            precautions.push('Allow extra travel time');
        }

        // Wind precautions
        if (wind_kph > 20) {
            precautions.push('Strong winds - secure loose items');
            precautions.push('Be careful with umbrellas');
        }

        // Humidity precautions
        if (humidity > 80) {
            precautions.push('High humidity - stay hydrated');
            precautions.push('Light, breathable clothing recommended');
        }

        return precautions;
    }

    async function getAdvisories(location) {
        try {
            advisoriesContainer.innerHTML = '<div class="loading">Loading advisories...</div>';
            errorElement.textContent = '';

            const response = await fetch(
                `https://api.weatherapi.com/v1/forecast.json?key=32804b24a847407391c53709241010&q=${location}&days=1`
            );
            
            if (!response.ok) {
                throw new Error('Weather data not available');
            }

            const data = await response.json();
            const recommendations = {
                clothing: getClothingRecommendations(data.current.temp_c, data.current.condition.text),
                activities: getActivityRecommendations(data.current.temp_c, data.current.condition.text),
                precautions: getPrecautions(data.current.temp_c, data.current.condition.text, 
                                         data.current.humidity, data.current.wind_kph)
            };

            displayAdvisory({
                location: data.location,
                current: data.current,
                recommendations: recommendations
            });
        } catch (error) {
            console.error('Error getting advisories:', error);
            errorElement.textContent = `Error: ${error.message}`;
            advisoriesContainer.innerHTML = '';
        }
    }

    function displayAdvisory(data) {
        console.log('Displaying advisory data:', data);
        
        const current = data.current;
        const recommendations = data.recommendations;

        advisoriesContainer.innerHTML = `
            <div class="advisory-card">
                <h2>${data.location.name} Travel Advisory</h2>
                <div class="weather-details">
                    <div class="weather-item">
                        <i class="fas fa-thermometer-half"></i>
                        <span>Temperature: ${current.temp_c}°C (Feels like ${current.feelslike_c}°C)</span>
                    </div>
                    <div class="weather-item">
                        <i class="fas fa-tint"></i>
                        <span>Humidity: ${current.humidity}%</span>
                    </div>
                    <div class="weather-item">
                        <i class="fas fa-wind"></i>
                        <span>Wind: ${current.wind_kph} km/h ${current.wind_dir}</span>
                    </div>
                </div>

                <div class="recommendations-section">
                    <h3><i class="fas fa-tshirt"></i> Clothing Recommendations</h3>
                    <ul class="recommendations-list">
                        ${recommendations.clothing.map(item => `
                            <li><i class="fas fa-check"></i> ${item}</li>
                        `).join('')}
                    </ul>

                    <h3><i class="fas fa-walking"></i> Recommended Activities</h3>
                    <ul class="recommendations-list">
                        ${recommendations.activities.map(item => `
                            <li><i class="fas fa-check"></i> ${item}</li>
                        `).join('')}
                    </ul>

                    <h3><i class="fas fa-exclamation-triangle"></i> Precautions</h3>
                    <ul class="recommendations-list">
                        ${recommendations.precautions.map(item => `
                            <li><i class="fas fa-exclamation-circle"></i> ${item}</li>
                        `).join('')}
                    </ul>
                </div>

                <p class="last-updated">Last Updated: ${new Date(current.last_updated).toLocaleString()}</p>
            </div>
        `;
    }

    // Event listeners
    searchButton.addEventListener('click', () => {
        console.log('Search button clicked');
        const location = locationInput.value.trim();
        if (location) {
            getAdvisories(location);
        } else {
            errorElement.textContent = 'Please enter a location';
        }
    });

    locationInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const location = locationInput.value.trim();
            if (location) {
                getAdvisories(location);
            } else {
                errorElement.textContent = 'Please enter a location';
            }
        }
    });

    // Load KL advisory by default
    loadDefaultAdvisory();
});