/**
 * Utilities for exporting farm field boundaries to standard geospatial
 * formats (GeoJSON and KML) so farmers can share them with tractor
 * software, agronomists, or GIS tools.
 */

export interface ExportableField {
  id: string;
  name: string;
  area_acres: number;
  area_hectares?: number;
  polygon: Array<{ lat: number; lng: number }>;
}

/**
 * Converts a list of farm fields into a GeoJSON FeatureCollection.
 * Each field becomes a Polygon Feature with its name and area as properties.
 *
 * Note: GeoJSON coordinates are [longitude, latitude] (opposite of {lat, lng}).
 * The polygon ring is closed by repeating the first point at the end,
 * per the GeoJSON spec (RFC 7946).
 */
export function fieldsToGeoJSON(fields: ExportableField[], farmName?: string) {
  const features = fields
    .filter(field => field.polygon && field.polygon.length >= 3)
    .map(field => {
      const ring = field.polygon.map(p => [p.lng, p.lat]);
      // Close the ring if not already closed
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push(first);
      }

      return {
        type: 'Feature' as const,
        properties: {
          name: field.name,
          area_acres: field.area_acres,
          area_hectares: field.area_hectares,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
      };
    });

  return {
    type: 'FeatureCollection' as const,
    name: farmName || 'Farm Fields',
    features,
  };
}

/**
 * Converts a list of farm fields into a KML document string.
 * Each field becomes a <Placemark> with a <Polygon>.
 *
 * KML coordinates are "lng,lat,altitude" tuples, space-separated within
 * a <coordinates> element, and the outer boundary ring must be closed.
 */
export function fieldsToKML(fields: ExportableField[], farmName?: string): string {
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const placemarks = fields
    .filter(field => field.polygon && field.polygon.length >= 3)
    .map(field => {
      const coords = [...field.polygon];
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first.lat !== last.lat || first.lng !== last.lng) {
        coords.push(first);
      }

      const coordinateString = coords
        .map(p => `${p.lng},${p.lat},0`)
        .join(' ');

      const areaDesc = field.area_hectares
        ? `${field.area_acres.toFixed(2)} acres (${field.area_hectares.toFixed(2)} ha)`
        : `${field.area_acres.toFixed(2)} acres`;

      return `    <Placemark>
      <name>${escapeXml(field.name)}</name>
      <description>${escapeXml(areaDesc)}</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordinateString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(farmName || 'Farm Fields')}</name>
${placemarks}
  </Document>
</kml>`;
}

/**
 * Triggers a browser download of the given text content as a file.
 */
function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Builds a safe filename from a farm name, e.g. "My Farm" -> "my-farm". */
function slugifyFilename(name: string): string {
  return (
    (name || 'farm')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'farm'
  );
}

/** Exports the given fields as a downloaded .geojson file. */
export function exportFieldsAsGeoJSON(fields: ExportableField[], farmName?: string) {
  const geojson = fieldsToGeoJSON(fields, farmName);
  const content = JSON.stringify(geojson, null, 2);
  const filename = `${slugifyFilename(farmName ?? 'farm')}-boundaries.geojson`;
  downloadTextFile(content, filename, 'application/geo+json');
}

/** Exports the given fields as a downloaded .kml file. */
export function exportFieldsAsKML(fields: ExportableField[], farmName?: string) {
  const kml = fieldsToKML(fields, farmName);
  const filename = `${slugifyFilename(farmName ?? 'farm')}-boundaries.kml`;
  downloadTextFile(kml, filename, 'application/vnd.google-earth.kml+xml');
}
