// --- CLOUD DATENBANK VERBINDUNG ---
const supabaseUrl = 'https://fpjvswrczniesuttrmvx.supabase.co'; // z.B. 'https://asdfghjkl.supabase.co'
const supabaseKey = 'sb_publishable_E7LtJBfyS5pkud85etUnsQ_1Y1ZTY2B';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null; // Speichert den aktuell eingeloggten Nutzer

const DB_KEY = "maischewagen_profile";

// NEU: Unsere feste Liste von Standard-Fahrzeugen (Presets)
const PRESETS = [
  {
    id: "preset_1",
    name: "Zickler 50S (klein)",
    B: 2.2, HD: 1.0, HR: 0.5, Lo: 4.0, Lu: 3.0, DS: 0.3
  },
  {
    id: "preset_2",
    name: "Zickler 50SH (groß)",
    B: 2.2, HD: 1.0, HR: 0.8, Lo: 4.0, Lu: 3.0, DS: 0.3
  }
  // Du kannst hier später beliebig viele weitere hinzufügen!
];

// --- NEU: Globale Variable für unsere Cloud-Daten ---
let cloudProfile = []; 

// 1. App-Start
window.onload = async function() {
  // 1. Prüfen, ob wir schon eingeloggt sind
  const { data: { session } } = await db.auth.getSession();
  currentUser = session ? session.user : null;
  authUiAktualisieren();

  // 2. Supabase sagen: "Sag mir Bescheid, wenn sich der Login-Status ändert"
  db.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    authUiAktualisieren();
    dropdownAktualisieren(); // Dropdown neu laden!
  });

  await dropdownAktualisieren();
  neuBerechnen();
};

// 2. Die reine Mathematik (wie vorher), mit Schnecke Standard-Wert 30cm
function berechneMaische(B, HD, HR, Lo, Lu, d_cm, D_schnecke = 0.3, dichte = 1000) {
  const H_ges = HD + HR;
  const h = Math.max(0, Math.min(H_ges, H_ges - (d_cm / 100)));
  const k = H_ges > 0 ? (Lo - Lu) / H_ges : 0;

  let v_m3 = 0;
  if (h <= HD) {
    v_m3 = HD > 0 ? (B / HD) * (Lu * Math.pow(h, 2) / 2 + k * Math.pow(h, 3) / 3) : 0;
  } else {
    const v_unten = HD > 0 ? (B / HD) * (Lu * Math.pow(HD, 2) / 2 + k * Math.pow(HD, 3) / 3) : 0;
    const v_oben = B * (Lu * (h - HD) + (k / 2) * (Math.pow(h, 2) - Math.pow(HD, 2)));
    v_m3 = v_unten + v_oben;
  }

// NEU: Schneckenvolumen berechnen und abziehen
  let end_v_m3 = v_m3;
  if (h > 0) { // Nur abziehen, wenn überhaupt Maische im Wagen ist
    const radius = D_schnecke / 2;
    const v_schnecke_m3 = Math.PI * Math.pow(radius, 2) * Lu; 
    end_v_m3 = Math.max(0, v_m3 - v_schnecke_m3); // Verhindert negative Werte
  }

  const liter = Math.round((end_v_m3 * 1000));
  const gewicht = Math.round((liter * dichte) / 1000);
  return { fuellhoehe: h.toFixed(2), liter, gewicht };
}

// 3. Werte aus den Feldern holen, rechnen und Ergebnis anzeigen (Bleibt fast gleich)
function neuBerechnen() {
  const B = parseFloat(document.getElementById("inp_B").value) || 0;
  const HD = parseFloat(document.getElementById("inp_HD").value) || 0;
  const HR = parseFloat(document.getElementById("inp_HR").value) || 0;
  const Lo = parseFloat(document.getElementById("inp_Lo").value) || 0;
  const Lu = parseFloat(document.getElementById("inp_Lu").value) || 0;
  const DS = parseFloat(document.getElementById("inp_DS").value) || 0;
  const d_cm = parseFloat(document.getElementById("inp_d").value) || 0;

  const ergebnis = berechneMaische(B, HD, HR, Lo, Lu, d_cm, DS);

  document.getElementById("out_h").innerText = ergebnis.fuellhoehe;
  document.getElementById("out_liter").innerText = ergebnis.liter.toLocaleString("de-DE");
  document.getElementById("out_gewicht").innerText = ergebnis.gewicht.toLocaleString("de-DE");
}

// 4. HYBRID-SPEICHERN: Neuen Wagen anlegen
async function profilAnlegen() {
  const name = document.getElementById("w_name").value.trim();
  if (!name) {
    alert("Bitte gib einen Namen für den Wagen ein!");
    return;
  }

  const neuerWagen = {
    name: name,
    B: parseFloat(document.getElementById("inp_B").value) || 0,
    HD: parseFloat(document.getElementById("inp_HD").value) || 0,
    HR: parseFloat(document.getElementById("inp_HR").value) || 0,
    Lo: parseFloat(document.getElementById("inp_Lo").value) || 0,
    Lu: parseFloat(document.getElementById("inp_Lu").value) || 0,
    DS: parseFloat(document.getElementById("inp_DS").value) || 0
  };

  if (currentUser) {
    // CLOUD SPEICHERN (Eingeloggt)
    const { error } = await db.from('fahrzeuge').insert([neuerWagen]);
    if (error) {
      alert("Fehler beim Speichern in der Cloud: " + error.message);
      return;
    }
    alert('Wagen "' + name + '" wurde für dein Team in der Cloud gespeichert!');
  } else {
    // LOKAL SPEICHERN (Gast)
    neuerWagen.id = "local_" + Date.now(); // Wir geben ihm eine eindeutige lokale ID
    let localProfile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    localProfile.push(neuerWagen);
    localStorage.setItem(DB_KEY, JSON.stringify(localProfile));
    alert('Wagen "' + name + '" wurde lokal auf diesem Gerät gespeichert!');
  }

  document.getElementById("w_name").value = "";
  await dropdownAktualisieren();
}


// 5. HYBRID-LADEN: Dropdown füllen
async function dropdownAktualisieren() {
  const select = document.getElementById("wagenSelect");
  
  // A. Cloud-Daten holen (nur wenn eingeloggt)
  cloudProfile = [];
  if (currentUser) {
    const { data, error } = await db.from('fahrzeuge').select('*');
    if (!error && data) cloudProfile = data;
  }

  // B. Lokale Daten holen
  const localProfile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");

  select.innerHTML = '<option value="">-- Manuelle Eingabe --</option>';
  
  // Kategorie 1: Presets
  if (PRESETS.length > 0) {
    const groupPresets = document.createElement("optgroup");
    groupPresets.label = "Standard-Modelle";
    PRESETS.forEach(wagen => {
      const option = document.createElement("option");
      option.value = wagen.id;
      option.text = wagen.name;
      groupPresets.appendChild(option);
    });
    select.appendChild(groupPresets);
  }

  // Kategorie 2: Lokale Wägen
  if (localProfile.length > 0) {
    const groupLocal = document.createElement("optgroup");
    groupLocal.label = "Meine lokalen Wägen (Nur hier)";
    localProfile.forEach(wagen => {
      const option = document.createElement("option");
      option.value = wagen.id;
      option.text = wagen.name;
      groupLocal.appendChild(option);
    });
    select.appendChild(groupLocal);
  }
  
  // Kategorie 3: Cloud Wägen
  if (cloudProfile.length > 0) {
    const groupCloud = document.createElement("optgroup");
    groupCloud.label = "Cloud-Wägen (Team)";
    cloudProfile.forEach(wagen => {
      const option = document.createElement("option");
      option.value = wagen.id;
      option.text = wagen.name;
      groupCloud.appendChild(option);
    });
    select.appendChild(groupCloud);
  }
}


// 3. HYBRID-AUSWÄHLEN (Muss wissen, woher der Wagen kommt)
function wagenAuswaehlen() {
  const select = document.getElementById("wagenSelect");
  const gewaehlteId = select.value;
  const btnLoeschen = document.getElementById("btn_loeschen");
  
  if (!gewaehlteId) {
    btnLoeschen.style.display = "none"; 
    return;
  }

  const localProfile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  
  // 1. Zuerst bei den unlöschbaren Presets gucken
  let wagen = PRESETS.find(p => p.id === gewaehlteId);
  
  if (wagen) {
    btnLoeschen.style.display = "none";
  } else {
    // 2. Wenn nicht Preset, dann in Cloud ODER Lokal suchen
    wagen = cloudProfile.find(p => p.id == gewaehlteId) || localProfile.find(p => p.id === gewaehlteId);
    if (wagen) {
      btnLoeschen.style.display = "block"; // Löschen erlauben
    }
  }

  if (wagen) {
    document.getElementById("inp_B").value = wagen.B;
    document.getElementById("inp_HD").value = wagen.HD;
    document.getElementById("inp_HR").value = wagen.HR;
    document.getElementById("inp_Lo").value = wagen.Lo;
    document.getElementById("inp_Lu").value = wagen.Lu;
    document.getElementById("inp_DS").value = wagen.DS || 0; 
    
    neuBerechnen();
    document.getElementById("masseDetails").removeAttribute("open");
  }
}


// 6. HYBRID-LÖSCHEN
async function profilLoeschen() {
  const select = document.getElementById("wagenSelect");
  const gewaehlteId = select.value;

  if (!gewaehlteId) return;

  const bestaetigt = confirm("Möchtest du diesen Wagen wirklich löschen?");
  if (!bestaetigt) return; 

  // Wir prüfen am Namen der ID, ob es ein lokaler Wagen ist
  if (String(gewaehlteId).startsWith("local_")) {
    let localProfile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    localProfile = localProfile.filter(w => w.id !== gewaehlteId);
    localStorage.setItem(DB_KEY, JSON.stringify(localProfile));
  } else {
    // Wenn nicht, ist es ein Cloud-Wagen -> aus Supabase löschen
    const { error } = await db.from('fahrzeuge').delete().eq('id', gewaehlteId);
    if (error) {
      alert("Fehler beim Löschen aus der Cloud: " + error.message);
      return;
    }
  }

  await dropdownAktualisieren();
  select.value = ""; 
  document.getElementById("btn_loeschen").style.display = "none";
}
// --- NEU: AUTHENTIFIZIERUNG ---

// Zeigt oder versteckt das Login-Fenster
function authUiAktualisieren() {
  const btnHeader = document.getElementById("btn_open_login");
  const btnSave = document.getElementById("btn_save");   // NEU: Speichern-Button
  const saveHint = document.getElementById("saveHint"); // NEU: Erklär-Text
  
  if (currentUser) {
    document.getElementById('loggedOutView').style.display = 'none';
    document.getElementById('loggedInView').style.display = 'block';
    document.getElementById('userEmail').innerText = currentUser.email;
    
    // Header-Button anpassen (Grün)
    btnHeader.innerText = "⚙️ " + currentUser.email.split('@')[0];
    btnHeader.style.backgroundColor = "var(--success-color)";

    // NEU: Speichern-Bereich auf CLOUD umschalten
    if(btnSave) btnSave.innerText = "☁️ Fürs Team in der Cloud speichern";
    if(saveHint) saveHint.innerText = "Speichert den Wagen sicher in der Cloud, sichtbar für alle Mitarbeiter deines Weinguts.";
    
  } else {
    document.getElementById('loggedOutView').style.display = 'block';
    document.getElementById('loggedInView').style.display = 'none';
    document.getElementById('userEmail').innerText = '';
    
    // Header-Button anpassen (Orange)
    btnHeader.innerText = "👤 Login";
    btnHeader.style.backgroundColor = "var(--primary-color)";

    // NEU: Speichern-Bereich auf LOKAL umschalten
    if(btnSave) btnSave.innerText = "💾 Lokal auf diesem Gerät speichern";
    if(saveHint) saveHint.innerText = "Speichert die Maße nur hier im Browser-Cache. Für Team-Synchronisation bitte oben einloggen!";
  }
}

// Registrieren
async function register() {
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  
  if(!email || !password) return alert("Bitte E-Mail und Passwort eingeben!");

  const { data, error } = await db.auth.signUp({ email, password });
  if (error) alert("Fehler: " + error.message);
  else alert("Erfolgreich registriert!");
  modalSchliessen();
}

// Einloggen
async function login() {
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  
  if(!email || !password) return alert("Bitte E-Mail und Passwort eingeben!");

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) alert("Fehler: " + error.message);
  modalSchliessen();
}

// Ausloggen
async function logout() {
  await db.auth.signOut();
  modalSchliessen();
}

function modalOeffnen() {
  document.getElementById("loginModal").style.display = "flex";
}
function modalSchliessen() {
  document.getElementById("loginModal").style.display = "none";
}
