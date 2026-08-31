// ResQ-Vision AI Dashboard Controller
let map;
let scenarioData = null;
let markersLayer = L.layerGroup();
let hazardsLayer = L.layerGroup();
let routeLayer = L.layerGroup();
let activeSector = null;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchScenario();
    fetchAuditLog();
});

// 1. Initialize Leaflet Map
function initMap() {
    map = L.map('tacticalMap', {
        zoomControl: true,
        attributionControl: false
    }).setView([20.2961, 85.8245], 14);

    // OpenStreetMap Standard Tiles for clean tactical view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abc'
    }).addTo(map);

    markersLayer.addTo(map);
    hazardsLayer.addTo(map);
    routeLayer.addTo(map);
}

// 2. Fetch Scenario Data
async function fetchScenario() {
    try {
        const res = await fetch('/api/scenario');
        scenarioData = await res.json();
        renderSectors(scenarioData.sectors);
        renderHazards(scenarioData.road_hazards);
        if (scenarioData.sectors.length > 0) {
            selectSector(scenarioData.sectors[0].id);
        }
    } catch (e) {
        console.error("Error loading scenario:", e);
    }
}

// 3. Render Sector Markers & Polygons
function renderSectors(sectors) {
    markersLayer.clearLayers();
    const queueContainer = document.getElementById('sectorQueue');
    queueContainer.innerHTML = '';

    let criticalCount = 0;
    let totalStructures = 0;

    sectors.forEach((sec, idx) => {
        totalStructures += (sec.structures_destroyed + sec.structures_major + sec.structures_minor);
        if (sec.priority_score >= 75) criticalCount++;

        // Color based on score
        const color = sec.priority_score >= 75 ? '#f43f5e' : (sec.priority_score >= 50 ? '#f97316' : '#10b981');

        // Map Circle Marker with Pulse
        const marker = L.circleMarker([sec.lat, sec.lng], {
            radius: 14 + (sec.priority_score / 10),
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.65
        }).addTo(markersLayer);

        marker.bindPopup(`
            <div style="color: #0f172a; font-family: sans-serif;">
                <h4 style="margin: 0; font-weight: bold; font-size: 13px;">${sec.name}</h4>
                <p style="margin: 3px 0 0 0; font-size: 11px;">Priority Score: <strong>${sec.priority_score}</strong> (${sec.urgency_tier})</p>
                <p style="margin: 3px 0 0 0; font-size: 11px;">Destroyed: ${sec.structures_destroyed} | Major: ${sec.structures_major}</p>
            </div>
        `);

        marker.on('click', () => selectSector(sec.id));

        // Queue Card in Left Panel
        const card = document.createElement('div');
        card.className = `p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${activeSector && activeSector.id === sec.id ? 'bg-slate-800 border-cyan-500 shadow-md shadow-cyan-500/10' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`;
        card.onclick = () => selectSector(sec.id);

        card.innerHTML = `
            <div class="space-y-1">
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold text-slate-200">#${idx + 1} ${sec.name}</span>
                </div>
                <div class="text-[11px] text-slate-400">
                    💥 Destroyed: <span class="text-rose-400 font-semibold">${sec.structures_destroyed}</span> | Major: <span class="text-orange-400">${sec.structures_major}</span>
                </div>
            </div>
            <div class="text-right">
                <span class="px-2 py-1 text-xs font-bold rounded-lg border ${sec.priority_score >= 75 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : (sec.priority_score >= 50 ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30')}">
                    ${sec.priority_score}
                </span>
                <span class="block text-[10px] text-slate-500 mt-1 uppercase font-semibold">${sec.rescue_status}</span>
            </div>
        `;
        queueContainer.appendChild(card);
    });

    document.getElementById('totalScanned').innerText = totalStructures;
    document.getElementById('criticalCount').innerText = criticalCount;
}

// 4. Render Road Hazards
function renderHazards(hazards) {
    hazardsLayer.clearLayers();
    hazards.forEach(haz => {
        const polyline = L.polyline(haz.coordinates, {
            color: '#ef4444',
            weight: 5,
            dashArray: '8, 8',
            opacity: 0.85
        }).addTo(hazardsLayer);

        polyline.bindPopup(`
            <div style="color: #0f172a; font-family: sans-serif;">
                <strong style="color: #dc2626;">⚠️ Hazard: ${haz.title}</strong>
                <p style="margin: 3px 0 0 0; font-size: 11px;">Type: ${haz.type} (${haz.severity})</p>
            </div>
        `);
    });
}

// 5. Select Sector & Calculate Safe Evacuation Path
function selectSector(sectorId) {
    if (!scenarioData) return;
    const sec = scenarioData.sectors.find(s => s.id === sectorId);
    if (!sec) return;
    activeSector = sec;

    // Update UI details
    document.getElementById('secName').innerText = sec.name;
    document.getElementById('secVuln').innerText = sec.population_density;
    document.getElementById('secWater').innerText = sec.flood_water_level;
    document.getElementById('secEvidence').innerText = "AI Evidence: " + sec.evidence;

    const badge = document.getElementById('selectedSectorBadge');
    badge.innerText = `${sec.id} (${sec.urgency_tier.split(' ')[0]})`;
    badge.className = `text-xs px-2 py-0.5 rounded-full font-bold border ${sec.priority_score >= 75 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`;

    // Highlight on Map and pan
    map.flyTo([sec.lat, sec.lng], 15, { duration: 0.8 });

    // Draw Safe Route from NDRF Base (20.2850, 85.8200) to Sector
    drawSafeRoute([20.2850, 85.8200], [sec.lat, sec.lng]);

    // Refresh Queue list highlight
    renderSectors(scenarioData.sectors);
}

// 6. Draw Simulated Safe Route
function drawSafeRoute(start, end) {
    routeLayer.clearLayers();
    // Path avoiding central obstacle
    const midPoint = [(start[0] + end[0]) / 2 + 0.002, (start[1] + end[1]) / 2 - 0.003];
    const route = [start, midPoint, end];

    L.polyline(route, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.9
    }).addTo(routeLayer);

    L.marker(start, {
        icon: L.divIcon({
            className: 'bg-cyan-500 text-white rounded-full p-1 text-center font-bold text-xs',
            html: '<i class="fa-solid fa-campground"></i>',
            iconSize: [24, 24]
        })
    }).bindPopup("<strong>NDRF Main Forward Base</strong>").addTo(routeLayer);
}

// 7. Toggle Weights & Recalculate
function toggleWeightSliders() {
    const el = document.getElementById('weightSlidersContainer');
    const caret = document.getElementById('sliderCaret');
    el.classList.toggle('hidden');
    caret.classList.toggle('rotate-180');
}

async function updateWeights() {
    const wD = parseFloat(document.getElementById('wDamage').value) / 100;
    const wV = parseFloat(document.getElementById('wVuln').value) / 100;
    const wA = parseFloat(document.getElementById('wAccess').value) / 100;

    document.getElementById('wDamageVal').innerText = `${Math.round(wD * 100)}%`;
    document.getElementById('wVulnVal').innerText = `${Math.round(wV * 100)}%`;
    document.getElementById('wAccessVal').innerText = `${Math.round(wA * 100)}%`;

    try {
        const res = await fetch('/api/triage/recalculate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ w_damage: wD, w_vuln: wV, w_access: wA })
        });
        const data = await res.json();
        scenarioData.sectors = data.ranked_sectors;
        renderSectors(scenarioData.sectors);
    } catch (e) {
        console.error("Error recalculating weights:", e);
    }
}

// 8. AI Vision Studio Simulation
async function simulateAnalysis(type) {
    const box = document.getElementById('aiAnalysisResults');
    box.classList.remove('hidden');
    box.innerHTML = `<div class="text-center py-4 text-cyan-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Running Siamese Change Detection & YOLOv8 Segmentation...</div>`;

    try {
        const res = await fetch('/api/analyze-imagery', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type: type })
        });
        const data = await res.json();

        box.innerHTML = `
            <div class="flex justify-between items-center font-bold text-slate-200">
                <span>Model: ${data.model}</span>
                <span class="text-emerald-400 font-mono">${data.summary.mean_confidence}% Confidence</span>
            </div>
            <div class="grid grid-cols-4 gap-1 text-[11px] text-center my-2">
                <div class="bg-rose-950/60 border border-rose-800/40 p-1.5 rounded">
                    <span class="text-rose-400 font-bold block">${data.summary.destroyed_count}</span>
                    <span class="text-[9px] text-slate-400">Destroyed</span>
                </div>
                <div class="bg-orange-950/60 border border-orange-800/40 p-1.5 rounded">
                    <span class="text-orange-400 font-bold block">${data.summary.major_damage_count}</span>
                    <span class="text-[9px] text-slate-400">Major</span>
                </div>
                <div class="bg-amber-950/60 border border-amber-800/40 p-1.5 rounded">
                    <span class="text-amber-400 font-bold block">${data.summary.minor_damage_count}</span>
                    <span class="text-[9px] text-slate-400">Minor</span>
                </div>
                <div class="bg-emerald-950/60 border border-emerald-800/40 p-1.5 rounded">
                    <span class="text-emerald-400 font-bold block">${data.summary.intact_count}</span>
                    <span class="text-[9px] text-slate-400">Intact</span>
                </div>
            </div>
            <p class="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800 pt-1.5">
                <strong>Key Findings:</strong> ${data.explainable_insights[0]}
            </p>
        `;
    } catch (e) {
        box.innerHTML = `<div class="text-rose-400 text-xs">Error running vision pipeline.</div>`;
    }
}

// 9. Dispatch Rescue Team
async function executeDispatch() {
    if (!activeSector) return;
    try {
        const res = await fetch('/api/dispatch', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sector_id: activeSector.id,
                unit_name: 'NDRF 03 Bn Inflatable Boat Convoy'
            })
        });
        const data = await res.json();
        alert(`✅ ${data.message}`);
        fetchScenario();
        fetchAuditLog();
    } catch (e) {
        alert("Dispatch error");
    }
}

// 10. Audit Log & Human Verification
async function fetchAuditLog() {
    try {
        const res = await fetch('/api/audit-log');
        const logs = await res.json();
        const container = document.getElementById('auditLogList');
        container.innerHTML = '';

        logs.forEach(l => {
            const div = document.createElement('div');
            div.className = 'p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-300 text-[11px]">${l.officer}</span>
                    <span class="text-[10px] text-slate-500 font-mono">${l.timestamp.split(' ')[1]}</span>
                </div>
                <div class="text-[11px] text-cyan-400 font-medium">${l.action} (${l.sector_id})</div>
                <p class="text-[11px] text-slate-400">${l.notes}</p>
            `;
            container.appendChild(div);
        });
    } catch (e) {}
}

function openVerifyModal() {
    document.getElementById('verifyModal').classList.remove('hidden');
}
function closeVerifyModal() {
    document.getElementById('verifyModal').classList.add('hidden');
}

async function submitVerification() {
    if (!activeSector) return;
    const officer = document.getElementById('officerName').value;
    const action = document.getElementById('verifyAction').value;
    const notes = document.getElementById('verifyNotes').value;

    try {
        await fetch('/api/hitl/verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sector_id: activeSector.id,
                officer: officer,
                action: action,
                notes: notes
            })
        });
        closeVerifyModal();
        fetchAuditLog();
        alert("✅ Field Verification successfully committed to immutable audit trail!");
    } catch (e) {}
}

function resetMapView() {
    if (map && scenarioData) {
        map.setView(scenarioData.map_center, scenarioData.zoom_level);
    }
}

function toggleMapLayer(layer) {
    if (layer === 'damage') {
        if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer);
        else map.addLayer(markersLayer);
    } else if (layer === 'hazards') {
        if (map.hasLayer(hazardsLayer)) map.removeLayer(hazardsLayer);
        else map.addLayer(hazardsLayer);
    }
}
