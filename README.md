# 🚜 Maischewagen Rechner

> Eine leichte, responsive Web-App zur schnellen Berechnung von Volumen und Gewicht von Maischewägen anhand der Füllhöhe.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Web%20App-brightgreen?style=for-the-badge)](https://johannklein.github.io/maischewagen/

---

## 💡 Über das Projekt

Der **Maischewagen Rechner** dient zur einfachen Füllstandsberechnung direkt im Betrieb. Über die Eingabe der Wagenausmaße und des gemessenen Abstands ($d$) von der Oberkante bis zur Maische wird automatisch das verbleibende Volumen und das Nettogewicht berechnet.

### ✨ Funktionen
- 📏 **Echtzeit-Berechnung:** Sofortige Aktualisierung von Füllhöhe ($h$), Volumen (Liter) und Gewicht (kg) beim Tippen.
- 💾 **Wagen-Profile speichern:** Fahrzeugdaten ($B, H_D, H_R, L_o, L_u$) abspeichern und bequem per Dropdown auswählen.
- 📱 **Mobile First:** Optimiert für Smartphones und die schnelle Nutzung auf dem Feld.
- 🔒 **Datenschutz & Offline-ready:** Alle gespeicherten Profile bleiben lokal auf dem eigenen Smartphone/Browser (`localStorage`).

---

## 📐 Mathematisches Modell

Die App berücksichtig sowohl den dreieckigen (unteren) als auch den rechteckigen (oberen) Querschnitt des Wagens sowie eine eventuelle Längenneigung:

1. **Gesamthöhe:** $H_{ges} = H_D + H_R$
2. **Füllhöhe:** $h = H_{ges} - d$ (begrenzt auf $0 \dots H_{ges}$)
3. **Volumen:** Berechnung über die veränderliche Breite und Länge je nach Füllhöhe.

---

## 🛠️ Verwendete Technologien

* **HTML5** – Struktur & Formular-Inputs
* **CSS3** – Responsive App-Optik (Mobile Cards & Touch-Optimierung)
* **JavaScript (ES6)** – Berechnungslogik & `localStorage`-Verwaltung

---

## 🚀 Lokale Entwicklung

Falls du das Projekt auf deinem eigenen PC in VS Code ausführen möchtest:

1. Repository klonen oder als ZIP herunterladen.
2. In **VS Code** öffnen.
3. Mit der Erweiterung **Live Server** auf `index.html` klicken und *Go Live* wählen.

---

## 📝 Lizenz

Dieses Projekt ist unter der **MIT-Lizenz** frei verwendbar.
