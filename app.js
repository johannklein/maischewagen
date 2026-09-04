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

// Wird aufgerufen, sobald die Seite geladen ist
window.onload = function() {
  dropdownAktualisieren();
  neuBerechnen(); // Einmal initial rechnen mit den Standardwerten
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

// 2. Werte aus den Feldern holen, rechnen und Ergebnis anzeigen
function neuBerechnen() {
  // Lese die aktuellen Werte aus den Eingabefeldern
  const B = parseFloat(document.getElementById("inp_B").value) || 0;
  const HD = parseFloat(document.getElementById("inp_HD").value) || 0;
  const HR = parseFloat(document.getElementById("inp_HR").value) || 0;
  const Lo = parseFloat(document.getElementById("inp_Lo").value) || 0;
  const Lu = parseFloat(document.getElementById("inp_Lu").value) || 0;
  const DS = parseFloat(document.getElementById("inp_DS").value) || 0; // NEU
  const d_cm = parseFloat(document.getElementById("inp_d").value) || 0;

  // Rechnen
  const ergebnis = berechneMaische(B, HD, HR, Lo, Lu, d_cm, DS);

  // Ergebnis in die HTML-Seite schreiben
  document.getElementById("out_h").innerText = ergebnis.fuellhoehe;
  document.getElementById("out_liter").innerText = ergebnis.liter.toLocaleString("de-DE");
  document.getElementById("out_gewicht").innerText = ergebnis.gewicht.toLocaleString("de-DE");
}

// 3. Dropdown-Logik: Ein Profil aus der Liste auswählen
function wagenAuswaehlen() {
  const select = document.getElementById("wagenSelect");
  const gewaehlteId = select.value;
  const btnLoeschen = document.getElementById("btn_loeschen"); // Den Button suchen
  
  // Wenn "Manuelle Eingabe" gewählt ist
  if (!gewaehlteId) {
    btnLoeschen.style.display = "none"; 
    return;
  }

  const profile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  
  // Prüfen, ob es ein Preset ist
  let wagen = PRESETS.find(p => p.id === gewaehlteId);
  
  if (wagen) {
    // Es ist ein Preset -> Löschen verbieten (Button verstecken)
    btnLoeschen.style.display = "none";
  } else {
    // Es ist kein Preset, also in eigenen Profilen suchen
    wagen = profile.find(p => p.id == gewaehlteId);
    if (wagen) {
      // Eigener Wagen -> Löschen erlauben (Button anzeigen)
      btnLoeschen.style.display = "block";
    }
  }

  // Felder ausfüllen
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

// 4. Aktuelle Werte als neues Profil speichern
function profilAnlegen() {
  const name = document.getElementById("w_name").value.trim();
  if (!name) {
    alert("Bitte gib einen Namen für den Wagen ein!");
    return;
  }

  const wagen = {
    id: Date.now(), // Erzeugt eine einzigartige ID
    name: name,
    B: parseFloat(document.getElementById("inp_B").value) || 0,
    HD: parseFloat(document.getElementById("inp_HD").value) || 0,
    HR: parseFloat(document.getElementById("inp_HR").value) || 0,
    Lo: parseFloat(document.getElementById("inp_Lo").value) || 0,
    Lu: parseFloat(document.getElementById("inp_Lu").value) || 0,
    DS: parseFloat(document.getElementById("inp_DS").value) || 0
  };

  const profile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  profile.push(wagen);
  localStorage.setItem(DB_KEY, JSON.stringify(profile));

  // Eingabefeld für den Namen wieder leeren und Dropdown updaten
  document.getElementById("w_name").value = "";
  dropdownAktualisieren();
  
  // Setze das Dropdown direkt auf den neu erstellten Wagen
  document.getElementById("wagenSelect").value = wagen.id;
  alert('Wagen "' + name + '" wurde erfolgreich gespeichert!');
}

// 5. Dropdown mit allen gespeicherten Wagen füllen
// Dropdown mit Presets und eigenen Wägen füllen
function dropdownAktualisieren() {
  const select = document.getElementById("wagenSelect");
  const profile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  
  // Leere das Dropdown
  select.innerHTML = '<option value="">-- Manuelle Eingabe --</option>';
  
  // 1. Kategorie: Die globalen Presets hinzufügen
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
  
  // 2. Kategorie: Die lokal gespeicherten Wägen des Nutzers
  if (profile.length > 0) {
    const groupEigene = document.createElement("optgroup");
    groupEigene.label = "Meine gespeicherten Wägen";
    profile.forEach(wagen => {
      const option = document.createElement("option");
      option.value = wagen.id;
      option.text = wagen.name;
      groupEigene.appendChild(option);
    });
    select.appendChild(groupEigene);
  }
}

// NEU: Ausgewähltes Profil löschen
function profilLoeschen() {
  const select = document.getElementById("wagenSelect");
  const gewaehlteId = select.value;

  if (!gewaehlteId) return;

  // Sicherheitsabfrage im Browser
  const bestaetigt = confirm("Möchtest du diesen Wagen wirklich unwiderruflich löschen?");
  if (!bestaetigt) return; // Wenn Nutzer auf Abbrechen klickt, stoppen

  // 1. Hole alle gespeicherten Profile
  let profile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  
  // 2. Filtere den Wagen heraus (Behalte alle, deren ID NICHT die gewählte ist)
  profile = profile.filter(wagen => wagen.id != gewaehlteId);
  
  // 3. Speichere die bereinigte Liste zurück
  localStorage.setItem(DB_KEY, JSON.stringify(profile));

  // 4. Aufräumen: Dropdown updaten, Auswahl zurücksetzen, Button verstecken
  dropdownAktualisieren();
  select.value = ""; 
  document.getElementById("btn_loeschen").style.display = "none";
}
