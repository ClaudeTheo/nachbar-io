import { describe, expect, it } from "vitest";
import {
  buildLglBwBbox,
  buildSearchBoundsFromPoints,
  findExactLglBwHouseCoordinate,
  normalizeAddressText,
  normalizeHouseNumber,
  parseLglBwAddressFeatures,
} from "@/lib/geocoding/lgl-bw";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:ad="http://inspire.ec.europa.eu/schemas/ad/4.0" xmlns:gml="http://www.opengis.net/gml/3.2">
  <wfs:member>
    <ad:Address gml:id="Address.PS35">
      <ad:position>
        <ad:GeographicPosition>
          <ad:geometry>
            <gml:Point srsName="EPSG:4258">
              <gml:pos>7.947937 47.562469</gml:pos>
            </gml:Point>
          </ad:geometry>
          <ad:specification xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://inspire.ec.europa.eu/codelist/GeometrySpecificationValue/building"/>
        </ad:GeographicPosition>
      </ad:position>
      <ad:locator>
        <ad:AddressLocator>
          <ad:designator>
            <ad:LocatorDesignator>
              <ad:designator>35</ad:designator>
            </ad:LocatorDesignator>
          </ad:designator>
        </ad:AddressLocator>
      </ad:locator>
      <ad:component xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#PostalDescriptor.79713"/>
      <ad:component xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ThoroughfareName.35"/>
    </ad:Address>
  </wfs:member>
  <wfs:member>
    <ad:Address gml:id="Address.OR11">
      <ad:position>
        <ad:GeographicPosition>
          <ad:geometry>
            <gml:Point srsName="EPSG:4258">
              <gml:pos>7.949957 47.561830</gml:pos>
            </gml:Point>
          </ad:geometry>
          <ad:specification xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="https://inspire.ec.europa.eu/codelist/GeometrySpecificationValue/building"/>
        </ad:GeographicPosition>
      </ad:position>
      <ad:locator>
        <ad:AddressLocator>
          <ad:designator>
            <ad:LocatorDesignator>
              <ad:designator>11</ad:designator>
            </ad:LocatorDesignator>
          </ad:designator>
        </ad:AddressLocator>
      </ad:locator>
      <ad:component xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#PostalDescriptor.79713"/>
      <ad:component xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#ThoroughfareName.11"/>
    </ad:Address>
  </wfs:member>
  <wfs:additionalObjects>
    <wfs:SimpleFeatureCollection>
      <wfs:member>
        <ad:PostalDescriptor gml:id="PostalDescriptor.79713">
          <ad:postName>
            <gn:GeographicalName xmlns:gn="http://inspire.ec.europa.eu/schemas/gn/4.0">
              <gn:spelling>
                <gn:SpellingOfName>
                  <gn:text>Bad Säckingen</gn:text>
                </gn:SpellingOfName>
              </gn:spelling>
            </gn:GeographicalName>
          </ad:postName>
          <ad:postCode>79713</ad:postCode>
        </ad:PostalDescriptor>
      </wfs:member>
      <wfs:member>
        <ad:ThoroughfareName gml:id="ThoroughfareName.35">
          <ad:name>
            <ad:ThoroughfareNameValue>
              <ad:name>
                <gn:GeographicalName xmlns:gn="http://inspire.ec.europa.eu/schemas/gn/4.0">
                  <gn:spelling>
                    <gn:SpellingOfName>
                      <gn:text>Purkersdorfer Straße</gn:text>
                    </gn:SpellingOfName>
                  </gn:spelling>
                </gn:GeographicalName>
              </ad:name>
            </ad:ThoroughfareNameValue>
          </ad:name>
        </ad:ThoroughfareName>
      </wfs:member>
      <wfs:member>
        <ad:ThoroughfareName gml:id="ThoroughfareName.11">
          <ad:name>
            <ad:ThoroughfareNameValue>
              <ad:name>
                <gn:GeographicalName xmlns:gn="http://inspire.ec.europa.eu/schemas/gn/4.0">
                  <gn:spelling>
                    <gn:SpellingOfName>
                      <gn:text>Oberer Rebberg</gn:text>
                    </gn:SpellingOfName>
                  </gn:spelling>
                </gn:GeographicalName>
              </ad:name>
            </ad:ThoroughfareNameValue>
          </ad:name>
        </ad:ThoroughfareName>
      </wfs:member>
    </wfs:SimpleFeatureCollection>
  </wfs:additionalObjects>
</wfs:FeatureCollection>`;

describe("lgl-bw parser", () => {
  it("parst Address-Features inkl. Street- und Postdaten", () => {
    const features = parseLglBwAddressFeatures(SAMPLE_XML);

    expect(features).toHaveLength(2);
    expect(features[0]).toMatchObject({
      id: "Address.PS35",
      streetName: "Purkersdorfer Straße",
      houseNumber: "35",
      postalCode: "79713",
      city: "Bad Säckingen",
      lat: 47.562469,
      lng: 7.947937,
    });
  });

  it("findet exakte Treffer trotz Str.-Normalisierung", () => {
    const features = parseLglBwAddressFeatures(SAMPLE_XML);

    const match = findExactLglBwHouseCoordinate(features, {
      streetName: "Purkersdorfer Str.",
      houseNumber: "35 ",
      postalCode: "79713",
      city: "Bad Saeckingen",
    });

    expect(match).toMatchObject({
      id: "Address.PS35",
      streetName: "Purkersdorfer Straße",
      houseNumber: "35",
    });
  });

  it("berechnet suchbare Bounds aus Quartierpunkten", () => {
    const bounds = buildSearchBoundsFromPoints([
      { lat: 47.5618, lng: 7.9479 },
      { lat: 47.5631, lng: 7.9655 },
    ]);

    expect(bounds.minLat).toBeLessThan(47.5618);
    expect(bounds.maxLng).toBeGreaterThan(7.9655);
    expect(buildLglBwBbox(bounds)).toContain("EPSG:4258");
  });

  it("normalisiert Strassen- und Hausnummern robust", () => {
    expect(normalizeAddressText(" Bad Säckingen ")).toBe("bad sackingen");
    expect(normalizeAddressText("Purkersdorfer Str.")).toBe(
      "purkersdorfer strasse",
    );
    expect(normalizeHouseNumber(" 11 a ")).toBe("11A");
  });
});
