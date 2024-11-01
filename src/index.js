const { ipcRenderer } = require('electron');
// Load page function
function loadPage(page) {
    document.querySelectorAll('.menu-items a').forEach(link => {
        link.classList.remove('active');
    });

    event.currentTarget.classList.add('active');

    switch(page) {
        case 'weather':
            break;
        case 'advisories':
            ipcRenderer.send('load-page', 'advisories');
            break;
        case 'itineraries':
            ipcRenderer.send('load-page', 'itineraries');
            break;
    }
}
// DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('locationInput').value = 'Kuala Lumpur';
        updateLocation();
    }, 500);

    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const weatherContainer = document.querySelector('.weather-container');
    let isMenuOpen = true;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;
        sideMenu.classList.toggle('collapsed');
        weatherContainer.classList.toggle('expanded');
        menuToggle.classList.toggle('menu-open');
        
        // Update button position
        if (!window.matchMedia('(max-width: 768px)').matches) {
            menuToggle.style.left = isMenuOpen ? '270px' : '20px';
        }
    }

    menuToggle.addEventListener('click', toggleMenu);

    // Initial state for desktop
    if (!window.matchMedia('(max-width: 768px)').matches) {
        menuToggle.style.left = '270px';
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
            menuToggle.style.left = '20px';
        } else {
            menuToggle.style.left = isMenuOpen ? '270px' : '20px';
        }
    });
});
// Update location function
function updateLocation() {
    const location = document.getElementById('locationInput').value;
    if (!location) {
        showError('Please enter a location');
        return;
    }
    
    ipcRenderer.send('update-location', location);
}
// Location input keypress event listener
document.getElementById('locationInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        updateLocation();
    }
});
// Show error function
function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.style.display = 'block';
    setTimeout(() => {
        error.style.display = 'none';
    }, 3000);
}
// Weather data event listener
ipcRenderer.on('weather-data', (event, data) => {
    if (data.error) {
        showError(data.error.message);
        return;
    }

    const weatherInfo = document.getElementById('weatherInfo');
    weatherInfo.innerHTML = `
        <div class="weather-app">
            <div class="app-header">
                <div class="logo">
                    <h1 class="location-title">${data.location.name}, ${data.location.region}</h1>
                    <p class="location-subtitle">${data.location.country}</p>
                </div>
            </div>
            
            <div class="weather-grid">
                <div class="weather-card">
                    <div class="card-header">
                        <i class="fas fa-thermometer-half"></i>
                        <h2>Current Weather</h2>
                    </div>
                    <div class="current-weather-display">
                        <img src="https:${data.current.condition.icon}" alt="Weather icon" class="weather-icon">
                        <div class="weather-details">
                            <div class="temperature">${data.current.temp_c}°C / ${data.current.temp_f}°F</div>
                            <div class="feels-like">Feels like: ${data.current.feelslike_c}°C / ${data.current.feelslike_f}°F</div>
                            <div class="condition">${data.current.condition.text}</div>
                        </div>
                    </div>
                </div>

                <div class="weather-card">
                    <div class="card-header">
                        <i class="fas fa-clock"></i>
                        <h2>Time & Forecast</h2>
                    </div>
                    <div class="info-row">
                        <span class="label">Local Time:</span>
                        <span class="value">${data.location.localtime}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Sunrise:</span>
                        <span class="value">${data.forecast.forecastday[0].astro.sunrise}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Sunset:</span>
                        <span class="value">${data.forecast.forecastday[0].astro.sunset}</span>
                    </div>
                </div>

                <div class="weather-card">
                    <div class="card-header">
                        <i class="fas fa-wind"></i>
                        <h2>Conditions</h2>
                    </div>
                    <div class="info-row">
                        <span class="label">Wind Speed:</span>
                        <span class="value">${data.current.wind_kph} km/h</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Humidity:</span>
                        <span class="value">${data.current.humidity}%</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Wind Direction:</span>
                        <span class="value">${data.current.wind_dir}</span>
                    </div>
                </div>

                <div class="weather-card">
                    <div class="card-header">
                        <i class="fas fa-calendar-day"></i>
                        <h2>Daily Forecast</h2>
                    </div>
                    <div class="info-row">
                        <span class="label">Max Temp:</span>
                        <span class="value">${data.forecast.forecastday[0].day.maxtemp_c}°C</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Min Temp:</span>
                        <span class="value">${data.forecast.forecastday[0].day.mintemp_c}°C</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Avg Temp:</span>
                        <span class="value">${data.forecast.forecastday[0].day.avgtemp_c}°C</span>
                    </div>
                </div>
            </div>

            <div class="forecast-section">
                <h2 class="forecast-title">3-Day Forecast</h2>
                <div class="forecast-grid">
                    ${data.forecast.forecastday.map(day => `
                        <div class="forecast-card">
                            <div class="forecast-date">${formatDate(day.date)}</div>
                            <img src="https:${day.day.condition.icon}" alt="Weather icon" class="forecast-icon">
                            <div class="forecast-temps">
                                <span class="max-temp">${day.day.maxtemp_c}°C</span>
                                <span class="min-temp">${day.day.mintemp_c}°C</span>
                            </div>
                            <div class="forecast-condition">${day.day.condition.text}</div>
                            <div class="forecast-details">
                                <div class="detail-item">
                                    <i class="fas fa-tint"></i>
                                    <span>${day.day.avghumidity}%</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-wind"></i>
                                    <span>${day.day.maxwind_kph} km/h</span>
                                </div>
                                <div class="detail-item">
                                    <i class="fas fa-cloud-rain"></i>
                                    <span>${day.day.daily_chance_of_rain}%</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
});
// Weather error event listener
ipcRenderer.on('weather-error', (event, message) => {
    console.log('Received error:', message); // Debug log
    showError(message);
});
// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric'
    });
}
// App ready event listener
ipcRenderer.on('app-ready', () => {
    document.getElementById('locationInput').value = 'Kuala Lumpur';
    updateLocation();
});
// Confirm exit function
function confirmExit() {
    console.log('Confirm exit clicked'); // Debug log
    const modal = document.getElementById('exitModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error('Exit modal not found'); // Debug log
    }
}
// Close exit modal function
function closeExitModal() {
    console.log('Close modal clicked'); // Debug log
    const modal = document.getElementById('exitModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
// Exit app function
function exitApp() {
    console.log('Exit app clicked'); // Debug log
    ipcRenderer.send('exit-app');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('exitModal');
    if (event.target === modal) {
        closeExitModal();
    }
}