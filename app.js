const DANDENONG_COORDS = { lat: -37.9810, lon: 145.2149 };

// DOM Elements
const form = document.getElementById('quote-form');
const pickupInput = document.getElementById('pickup');
const dropoffInput = document.getElementById('dropoff');
const itemsSelect = document.getElementById('items');
const budgetInput = document.getElementById('budget');
const hasStairsSelect = document.getElementById('has-stairs');
const flightsContainer = document.getElementById('flights-container');
const flightsSelect = document.getElementById('flights');
const noBannedCheck = document.getElementById('no-banned');

const calculateBtn = document.getElementById('calculate-btn');
const btnText = document.querySelector('.btn-text');
const spinner = document.querySelector('.spinner');
const errorBox = document.getElementById('error-box');

const resultsCard = document.getElementById('results');
const resultPrice = document.getElementById('result-price');
const resultTime = document.getElementById('result-time');
const distD1 = document.getElementById('dist-d1');
const distD2 = document.getElementById('dist-d2');
const liveDistances = document.getElementById('live-distances');
const liveD1 = document.getElementById('live-d1');
const liveD2 = document.getElementById('live-d2');
const ruleText = document.getElementById('rule-text');
const copyText = document.getElementById('copy-text');
const copyBtn = document.getElementById('copy-btn');
const resetBtn = document.getElementById('reset-btn');

// Auto-Magic Elements
const smartText = document.getElementById('smart-text');
const parseTextBtn = document.getElementById('parse-text-btn');
const screenshotUpload = document.getElementById('screenshot-upload');
const ocrStatus = document.getElementById('ocr-status');

// Helper to delay
const delay = ms => new Promise(res => setTimeout(res, ms));

// Autocomplete Logic
let autocompleteTimeout = null;
async function handleAutocomplete(e, listElement) {
    clearTimeout(autocompleteTimeout);
    const query = e.target.value;
    
    // Clear dataset coordinates when user types manually
    delete e.target.dataset.lat;
    delete e.target.dataset.lon;
    
    if (query.length < 2) {
        listElement.classList.add('hidden');
        return;
    }
    
    autocompleteTimeout = setTimeout(async () => {
        try {
            // Focus on Australia using countrycodes=au
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=au&q=${encodeURIComponent(query)}&limit=5`);
            const data = await res.json();
            
            listElement.innerHTML = '';
            if (data && data.length > 0) {
                data.forEach(item => {
                    const li = document.createElement('li');
                    const parts = item.display_name.split(', ');
                    li.textContent = parts.slice(0, 3).join(', '); // Show cleaner address
                    
                    li.addEventListener('click', async () => {
                        e.target.value = li.textContent;
                        e.target.dataset.lat = item.lat;
                        e.target.dataset.lon = item.lon;
                        listElement.classList.add('hidden');
                        await updateLiveDistances();
                    });
                    
                    listElement.appendChild(li);
                });
                listElement.classList.remove('hidden');
            } else {
                listElement.classList.add('hidden');
            }
        } catch (err) {
            console.error("Autocomplete failed", err);
        }
    }, 400); // 400ms debounce
}

// Geocode address using Nominatim (OpenStreetMap)
async function geocodeAddress(address) {
    const numMatch = address.match(/^([\d.]+)\s*(km)?$/i);
    if (numMatch) {
        return { isManualDist: true, dist: parseFloat(numMatch[1]) };
    }

    let query = address;
    if (!query.toLowerCase().includes('victoria') && !query.toLowerCase().includes('vic')) {
        query += ', Victoria, Australia';
    }

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                displayName: data[0].display_name
            };
        }
    } catch (e) {
        console.error("Geocoding failed", e);
    }
    return null;
}

// Get distance using OSRM
async function getDrivingDistance(coord1, coord2) {
    try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coord1.lon},${coord1.lat};${coord2.lon},${coord2.lat}?overview=false`);
        const data = await res.json();
        if (data && data.routes && data.routes.length > 0) {
            return data.routes[0].distance / 1000; // Convert meters to km
        }
    } catch (e) {
        console.error("Routing failed", e);
    }
    // Fallback to straight line (Haversine)
    return getHaversineDistance(coord1, coord2);
}

// Haversine formula (straight line distance)
function getHaversineDistance(coord1, coord2) {
    const R = 6371;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1.3; // 1.3 multiplier to approximate driving distance
}

// Function to update distances live in the form
async function updateLiveDistances() {
    let d1Text = "Pending...";
    let d2Text = "Pending...";
    let showLive = false;

    if (pickupInput.dataset.lat && pickupInput.dataset.lon) {
        showLive = true;
        liveD1.textContent = "Calculating...";
        const pickupCoords = { lat: parseFloat(pickupInput.dataset.lat), lon: parseFloat(pickupInput.dataset.lon) };
        const d1 = await getDrivingDistance(DANDENONG_COORDS, pickupCoords);
        d1Text = `${(d1).toFixed(1)} km`;
        
        if (dropoffInput.dataset.lat && dropoffInput.dataset.lon) {
            liveD2.textContent = "Calculating...";
            const dropoffCoords = { lat: parseFloat(dropoffInput.dataset.lat), lon: parseFloat(dropoffInput.dataset.lon) };
            const d2 = await getDrivingDistance(pickupCoords, dropoffCoords);
            d2Text = `${(d2).toFixed(1)} km`;
        }
    }

    if (showLive) {
        liveDistances.classList.remove('hidden');
        liveD1.textContent = d1Text;
        liveD2.textContent = d2Text;
    }
}

pickupInput.addEventListener('input', (e) => handleAutocomplete(e, document.getElementById('pickup-suggestions')));
dropoffInput.addEventListener('input', (e) => handleAutocomplete(e, document.getElementById('dropoff-suggestions')));

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
        document.getElementById('pickup-suggestions').classList.add('hidden');
        document.getElementById('dropoff-suggestions').classList.add('hidden');
    }
});

// Handle Stairs Selection
hasStairsSelect.addEventListener('change', (e) => {
    if (e.target.value === 'yes') {
        flightsContainer.classList.remove('hidden');
    } else {
        flightsContainer.classList.add('hidden');
    }
});

// Auto-Magic Parsing Logic
function parseAirtaskerText(rawText) {
    if (!rawText) return;
    
    // Clean text: Fix common OCR errors
    // Replace vertical bars with I, 0 with O (if in text), etc.
    let text = rawText.replace(/\|/g, 'I')
                      .replace(/\s+/g, ' ');
    
    console.log("Parsing Text:", text);

    // 1. Budget Detection (Enhanced)
    try {
        // Look for $XXX or XXX AUD or Budget: XXX
        const budgetPatterns = [
            /\$\s?(\d{2,4})/,
            /(\d{2,4})\s?AUD/i,
            /Budget[:\s]*\$?\s?(\d{2,4})/i,
            /Price[:\s]*\$?\s?(\d{2,4})/i,
            /Earn\s*?\$?\s*?(\d{2,4})/i
        ];
        
        for (let pattern of budgetPatterns) {
            const match = text.match(pattern);
            if (match) {
                budgetInput.value = match[1];
                break;
            }
        }
    } catch(e) {}

    // 2. Stairs Detection (Enhanced)
    try {
        const noStairsPatterns = [/no stairs/i, /ground floor/i, /elevator/i, /lift/i, /stairs[:\s]*no/i, /0 stairs/i];
        const hasStairsPatterns = [/stairs/i, /flight/i, /step/i, /level\s*[1-9]/i, /staircase/i];

        let foundNo = noStairsPatterns.some(p => p.test(text));
        let foundYes = hasStairsPatterns.some(p => p.test(text));

        // If "no stairs" is explicitly mentioned, prioritize it
        if (foundNo && !text.toLowerCase().includes('and stairs')) {
            hasStairsSelect.value = 'no';
            flightsContainer.classList.add('hidden');
        } else if (foundYes) {
            hasStairsSelect.value = 'yes';
            flightsContainer.classList.remove('hidden');
            
            // Try to find number of flights
            const flightMatch = text.match(/([1-3])\s*(flight|floor|stair|level)/i) || 
                               text.match(/(one|two|three)\s*(flight|floor|stair|level)/i);
            
            if (flightMatch) {
                let val = flightMatch[1].toLowerCase();
                if (val === '1' || val === 'one') flightsSelect.value = '1';
                else if (val === '2' || val === 'two') flightsSelect.value = '2';
                else if (val === '3' || val === 'three' || val === 'multiple') flightsSelect.value = '3';
            } else {
                // Default to 1 if "stairs" mentioned but no number
                flightsSelect.value = '1';
            }
        }
    } catch(e) {}

    // 3. Items / Removals Size (Enhanced)
    try {
        const sizePatterns = [
            /Removals size[:\s]*([A-Za-z0-9\s\+]+?)(?=\s[A-Z]|$|Budget|Date)/i,
            /Items[:\s]*([A-Za-z0-9\s,\+]+?)(?=\s[A-Z]|$|Budget|Date)/i
        ];

        let sizeFound = false;
        for (let p of sizePatterns) {
            const match = text.match(p);
            if (match) {
                const val = match[1].toLowerCase();
                if (val.includes('house') || val.includes('large') || val.includes('many') || val.includes('4+') || val.includes('lot')) {
                    itemsSelect.value = 'many';
                } else if (val.includes('apartment') || val.includes('few') || val.includes('couple') || val.includes('2-3') || val.includes('medium')) {
                    itemsSelect.value = 'couple';
                } else {
                    itemsSelect.value = '1';
                }
                sizeFound = true;
                break;
            }
        }

        if (!sizeFound) {
            // Count specific item mentions
            const commonItems = ['fridge', 'sofa', 'bed', 'couch', 'table', 'washing machine', 'dryer', 'wardrobe', 'desk', 'tv', 'cabinet'];
            let count = 0;
            commonItems.forEach(item => {
                const regex = new RegExp(item, 'gi');
                const matches = text.match(regex);
                if (matches) count += matches.length;
            });
            
            if (count >= 4) itemsSelect.value = 'many';
            else if (count >= 2) itemsSelect.value = 'couple';
            else itemsSelect.value = '1';
        }
    } catch(e) {}

    // 4. Pickup & Drop-off Detection (Smart Logic)
    try {
        // Airtasker usually has "From [Suburb]" and "To [Suburb]" on separate lines
        const pickupPatterns = [
            /(?:Pick\s?up|From)[:\s]+([A-Za-z\s\-]{3,25})(?=\s|,|\n|VIC|3\d{3})/i,
            /Pick\s?up\s?from\s?([A-Za-z\s\-]{3,25})/i
        ];
        const dropoffPatterns = [
            /(?:Drop\s?off|To)[:\s]+([A-Za-z\s\-]{3,25})(?=\s|,|\n|VIC|3\d{3})/i,
            /Drop\s?off\s?to\s?([A-Za-z\s\-]{3,25})/i
        ];

        for (let p of pickupPatterns) {
            const match = text.match(p);
            if (match && match[1].trim().length > 2) {
                let suburb = match[1].trim();
                // Clean up common extra words
                suburb = suburb.replace(/location|vic|victoria|3\d{3}/gi, '').trim();
                pickupInput.value = suburb;
                pickupInput.dispatchEvent(new Event('input'));
                break;
            }
        }

        for (let p of dropoffPatterns) {
            const match = text.match(p);
            if (match && match[1].trim().length > 2) {
                let suburb = match[1].trim();
                suburb = suburb.replace(/location|vic|victoria|3\d{3}/gi, '').trim();
                dropoffInput.value = suburb;
                dropoffInput.dispatchEvent(new Event('input'));
                break;
            }
        }
    } catch(e) {}
}

parseTextBtn.addEventListener('click', () => {
    parseAirtaskerText(smartText.value);
});

screenshotUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof Tesseract === 'undefined') {
        alert("Image scanner is still loading in the background. Please wait a few seconds and try again.");
        return;
    }

    ocrStatus.classList.remove('hidden');
    
    try {
        const result = await Tesseract.recognize(file, 'eng');
        smartText.value = result.data.text;
        parseAirtaskerText(result.data.text);
    } catch (err) {
        console.error(err);
        alert("Failed to read image. Please make sure it's a clear screenshot of text.");
    } finally {
        ocrStatus.classList.add('hidden');
        screenshotUpload.value = ''; // reset
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        calculateBtn.disabled = true;
        errorBox.classList.add('hidden');
    } else {
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        calculateBtn.disabled = false;
    }
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!noBannedCheck.checked) {
        showError("Please confirm there are no banned items (Pool table, Spa, etc.) before offering a quote.");
        return;
    }

    if (hasStairsSelect.value === 'yes' && flightsSelect.value === '3') {
        showError("We only carry items up to 2 flights using stairs. Please check with the team before offering a quote.");
        return;
    }

    const pickupStr = pickupInput.value.trim();
    const dropoffStr = dropoffInput.value.trim();
    const items = itemsSelect.value;
    const budgetStr = budgetInput.value.trim();
    const budget = budgetStr ? parseFloat(budgetStr) : null;

    setLoading(true);

    try {
        // 1. Calculate Dandenong to Pickup
        let pickupCoords = null;
        let d1 = 0;

        if (pickupInput.dataset.lat && pickupInput.dataset.lon) {
            pickupCoords = { lat: parseFloat(pickupInput.dataset.lat), lon: parseFloat(pickupInput.dataset.lon) };
            d1 = await getDrivingDistance(DANDENONG_COORDS, pickupCoords);
        } else {
            let pGeo = await geocodeAddress(pickupStr);
            if (!pGeo) {
                throw new Error(`Could not find pickup address: ${pickupStr}. Try entering distance in km manually (e.g. "20").`);
            }
            if (pGeo.isManualDist) {
                d1 = pGeo.dist;
            } else {
                pickupCoords = pGeo;
                d1 = await getDrivingDistance(DANDENONG_COORDS, pickupCoords);
            }
        }

        // 2. Calculate Pickup to Dropoff
        let d2 = 0;
        let dGeoManual = false;
        
        if (dropoffInput.dataset.lat && dropoffInput.dataset.lon) {
            let dropoffCoords = { lat: parseFloat(dropoffInput.dataset.lat), lon: parseFloat(dropoffInput.dataset.lon) };
            if (pickupCoords) {
                d2 = await getDrivingDistance(pickupCoords, dropoffCoords);
            }
        } else {
            let dGeo = await geocodeAddress(dropoffStr);
            if (!dGeo) {
                throw new Error(`Could not find drop-off address: ${dropoffStr}. Try entering distance in km manually (e.g. "15").`);
            }
            if (dGeo.isManualDist) {
                d2 = dGeo.dist;
                dGeoManual = true;
            } else {
                if (pickupCoords) {
                    d2 = await getDrivingDistance(pickupCoords, dGeo);
                }
            }
        }

        d1 = Math.round(d1 * 10) / 10;
        d2 = Math.round(d2 * 10) / 10;

        // Apply rules
        let price = 0;
        let hours = 0;
        let rule = "";

        if (d1 <= 30) {
            if (items === '1') {
                price = 186;
                hours = 1;
                rule = "Rule 3: <30km from Dandenong, 1 item";
            } else {
                price = 256;
                hours = 1.5;
                rule = "Rule 4: <30km from Dandenong, couple/multiple items";
            }
        } else {
            if (!budget) {
                throw new Error(`For distances over 30km (Pickup is ${d1}km from Dandenong), a Customer Budget is required to calculate the offer.`);
            }

            if (d1 <= 50) {
                if (budget < 290) {
                    price = 290;
                    hours = 1.5;
                    rule = "Rule 5: >30km from Dandenong, budget under $290";
                } else if (budget >= 290 && budget <= 425) { 
                    price = 350;
                    hours = 2;
                    rule = "Rule 6: <50km from Dandenong, budget close to $350";
                } else if (budget > 425 && budget <= 500) { 
                    price = 500;
                    hours = 3;
                    rule = "Rule 7: <50km from Dandenong, budget close to $500";
                } else if (budget > 500) {
                    price = budget;
                    hours = (budget / 165).toFixed(1);
                    rule = "Rule 8: <50km from Dandenong, budget > $500 (Budget / 165)";
                }
            } else {
                if (budget > 500) {
                    price = budget;
                    hours = (budget / 165).toFixed(1);
                    rule = "Distance > 50km, using Budget / 165 rule";
                } else {
                    price = budget > 290 ? budget : 290; 
                    hours = (price / 165).toFixed(1);
                    rule = "Distance > 50km. Manual check recommended. Using estimate based on budget.";
                }
            }
        }

        // Display results
        resultPrice.textContent = price;
        resultTime.textContent = `${hours} hours`;
        distD1.textContent = `${d1} km`;
        distD2.textContent = dGeoManual ? `${d2} km (Manual)` : `${d2} km`;
        ruleText.textContent = rule;

        let template = `Hi, send me your contact number, pick up address and drop off address please. \nJust to confirm, the quote includes up to ${hours} hours of service. If additional time is required to complete the job, it will be charged at $40 per 15 minutes as mentioned.\nThank you.`;
        copyText.textContent = template;

        form.classList.add('hidden');
        resultsCard.classList.remove('hidden');

    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
});

resetBtn.addEventListener('click', () => {
    resultsCard.classList.add('hidden');
    form.classList.remove('hidden');
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(copyText.textContent)
        .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            copyBtn.style.background = "var(--success)";
            copyBtn.style.color = "#fff";
            copyBtn.style.borderColor = "var(--success)";
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = "var(--surface-hover)";
                copyBtn.style.color = "var(--text)";
                copyBtn.style.borderColor = "var(--border)";
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy', err);
            alert("Failed to copy text.");
        });
});
