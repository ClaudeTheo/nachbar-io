-- Migration 104: AboID in ICS-URLs eintragen
-- AWB Waldshut erfordert seit kurzem eine gueltige AboID im Kalender-Abo
-- Ohne AboID: "Ungueltige Abo-ID" Fehler
-- AboIDs ermittelt am 2026-03-19 via AWB-Portal (stabil pro Standort)

-- BS-A: StandortID=1045914001, AboID=82571
UPDATE waste_collection_areas
SET ics_url = 'https://eigbeab.landkreis-waldshut.de/WasteManagementWaldshut/WasteManagementServiceServlet?ApplicationName=Calendar&SubmitAction=sync&StandortID=1045914001&AboID=82571&Fra=BT;S;BIO;RM;GS'
WHERE area_code = 'BS-A';

-- BS-B: StandortID=1029795001, AboID=82572
UPDATE waste_collection_areas
SET ics_url = 'https://eigbeab.landkreis-waldshut.de/WasteManagementWaldshut/WasteManagementServiceServlet?ApplicationName=Calendar&SubmitAction=sync&StandortID=1029795001&AboID=82572&Fra=BT;S;BIO;RM;GS'
WHERE area_code = 'BS-B';
