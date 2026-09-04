const DB_KEY = "maischewagen_profile";

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
  
  if (!gewaehlteId) return; // "Manuelle Eingabe" ausgewählt, wir tun nichts

  const profile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  // Finde das Profil mit der ausgewählten ID
  const wagen = profile.find(p => p.id == gewaehlteId);

  if (wagen) {
    // Felder mit den Werten aus der Datenbank überschreiben
    document.getElementById("inp_B").value = wagen.B;
    document.getElementById("inp_HD").value = wagen.HD;
    document.getElementById("inp_HR").value = wagen.HR;
    document.getElementById("inp_Lo").value = wagen.Lo;
    document.getElementById("inp_Lu").value = wagen.Lu;
    document.getElementById("inp_DS").value = wagen.DS || 0.3;
    
    // Nach dem Überschreiben sofort neu berechnen
    neuBerechnen();
    // Schließt das Ausklappmenü automatisch nach der Auswahl
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
function dropdownAktualisieren() {
  const select = document.getElementById("wagenSelect");
  const profile = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
  
  // Leere das Dropdown (behalte nur die manuelle Option)
  select.innerHTML = '<option value="">-- Manuelle Eingabe --</option>';
  
  // Füge für jedes gespeicherte Profil eine Option hinzu
  profile.forEach(wagen => {
    const option = document.createElement("option");
    option.value = wagen.id;
    option.text = wagen.name;
    select.appendChild(option);
  });
}