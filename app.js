// --- CLOUD DATENBANK VERBINDUNG ---
const supabaseUrl = 'https://fpjvswrczniesuttrmvx.supabase.co'; // z.B. 'https://asdfghjkl.supabase.co'
const supabaseKey = 'sb_publishable_E7LtJBfyS5pkud85etUnsQ_1Y1ZTY2B';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// ... danach kommt dein bisheriger Code (DB_KEY, PRESETS etc.)

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

// 1. App-Start (Wartet jetzt auf die Cloud)
window.onload = async function() {
  await dropdownAktualisieren(); // Zieht die Daten aus Supabase
  neuBerechnen();
};

// 1. Die reine Mathematik (wie vorher), mit Schnecke Standard-Wert 30cm
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

// 2. Werte aus den Feldern holen, rechnen und Ergebnis anzeigen (Bleibt fast gleich)
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

// 3. Dropdown-Logik: Wagen auswählen
function wagenAuswaehlen() {
  const select = document.getElementById("wagenSelect");
  const gewaehlteId = select.value;
  const btnLoeschen = document.getElementById("btn_loeschen");
  
  if (!gewaehlteId) {
    btnLoeschen.style.display = "none"; 
    return;
  }

  // Suche in Presets (mit === weil beides Texte sind)
  let wagen = PRESETS.find(p => p.id === gewaehlteId);
  
  if (wagen) {
    btnLoeschen.style.display = "none";
  } else {
    // Suche in Cloud-Profilen (mit == weil IDs aus Supabase evtl. Zahlen sind)
    wagen = cloudProfile.find(p => p.id == gewaehlteId);
    if (wagen) {
      btnLoeschen.style.display = "block";
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

// 4. CLOUD-SPEICHERN: Neuen Wagen anlegen
async function profilAnlegen() {
  const name = document.getElementById("w_name").value.trim();
  if (!name) {
    alert("Bitte gib einen Namen für den Wagen ein!");
    return;
  }

  // Wir verpacken die Maße für Supabase (ID wird von Supabase automatisch erzeugt!)
  const neuerWagen = {
    name: name,
    B: parseFloat(document.getElementById("inp_B").value) || 0,
    HD: parseFloat(document.getElementById("inp_HD").value) || 0,
    HR: parseFloat(document.getElementById("inp_HR").value) || 0,
    Lo: parseFloat(document.getElementById("inp_Lo").value) || 0,
    Lu: parseFloat(document.getElementById("inp_Lu").value) || 0,
    DS: parseFloat(document.getElementById("inp_DS").value) || 0
  };

  // Befehl an Supabase: Füge diese Zeile in die Tabelle 'fahrzeuge' ein
  const { error } = await db.from('fahrzeuge').insert([neuerWagen]);

  if (error) {
    alert("Fehler beim Speichern: " + error.message);
    return;
  }

  document.getElementById("w_name").value = "";
  await dropdownAktualisieren(); // Dropdown aktualisieren
  alert('Wagen "' + name + '" wurde erfolgreich in der Cloud gespeichert!');
}

// 5. CLOUD-LADEN: Dropdown füllen
async function dropdownAktualisieren() {
  const select = document.getElementById("wagenSelect");
  
  // Befehl an Supabase: Lese (*) alle Zeilen aus der Tabelle 'fahrzeuge'
  const { data, error } = await db.from('fahrzeuge').select('*');
  
  if (error) {
    console.error("Fehler beim Laden aus Supabase:", error);
    return;
  }
  
  // Wir speichern die geladenen Daten in unserer Variable
  cloudProfile = data || [];

  select.innerHTML = '<option value="">-- Manuelle Eingabe --</option>';
  
  if (PRESETS.length > 0) {
    const groupPresets = document.createElement("optgroup");
    groupPresets.label = "🌟 Standard-Modelle";
    PRESETS.forEach(wagen => {
      const option = document.createElement("option");
      option.value = wagen.id;
      option.text = wagen.name;
      groupPresets.appendChild(option);
    });
    select.appendChild(groupPresets);
  }
  
  if (cloudProfile.length > 0) {
    const groupEigene = document.createElement("optgroup");
    groupEigene.label = "☁️ Cloud-Wägen";
    cloudProfile.forEach(wagen => {
      const option = document.createElement("option");
      option.value = wagen.id;
      option.text = wagen.name;
      groupEigene.appendChild(option);
    });
    select.appendChild(groupEigene);
  }
}

// 6. CLOUD-LÖSCHEN
async function profilLoeschen() {
  const select = document.getElementById("wagenSelect");
  const gewaehlteId = select.value;

  if (!gewaehlteId) return;

  const bestaetigt = confirm("Möchtest du diesen Wagen aus der Cloud löschen? Er verschwindet dann für alle Nutzer.");
  if (!bestaetigt) return; 

  // Befehl an Supabase: Lösche die Zeile, wo die ID gleich der gewählten ID ist
  const { error } = await db
    .from('fahrzeuge')
    .delete()
    .eq('id', gewaehlteId);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
    return;
  }

  await dropdownAktualisieren();
  select.value = ""; 
  document.getElementById("btn_loeschen").style.display = "none";
}