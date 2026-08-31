/**
 * QuoteCraft Pro - Dynamic Satellite & Google Maps Engine
 * 
 * Features:
 * - Universal URL & input parser (Google Maps URLs, place links, @coords, q= params, embed iframes, DMS, raw coords, addresses)
 * - Pure client-side High-Resolution Esri World Imagery (Satellite) tile stitching onto HTML5 Canvas
 * - Generates high-quality base64 images that work seamlessly in both live preview and html2canvas PDF exports
 * - Geocoding fallback for plain addresses via OpenStreetMap Nominatim
 * - Custom solar site target pin, coordinates HUD, and satellite view badges
 */

class MapEngine {
  // Tile cache for ultra-fast instant re-rendering
  static tileCache = new Map();
  static imageCache = new Map();

  /**
   * Universal location parser for Google Maps links and coordinates
   */
  static parseLocation(input) {
    if (!input || typeof input !== "string") return null;
    const text = input.trim();
    if (!text) return null;

    // 1. Direct decimal coordinates: e.g. "17.385044, 78.486671" or "17.385044 78.486671"
    const coordMatch = text.match(/^(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          lat,
          lng,
          zoom: 17,
          title: `Site Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
          type: "coordinates"
        };
      }
    }

    // 2. DMS coordinates: e.g. 17°23'06.2"N 78°29'12.0"E
    const dmsMatch = text.match(/(\d+)°\s*(\d+)['\′]\s*([\d.]+)?["″]?\s*([NSns])[,\s]+(\d+)°\s*(\d+)['\′]\s*([\d.]+)?["″]?\s*([EWew])/);
    if (dmsMatch) {
      const [, d1, m1, s1, dir1, d2, m2, s2, dir2] = dmsMatch;
      let lat = parseFloat(d1) + parseFloat(m1) / 60 + (parseFloat(s1 || 0) / 3600);
      if (dir1.toUpperCase() === "S") lat = -lat;
      let lng = parseFloat(d2) + parseFloat(m2) / 60 + (parseFloat(s2 || 0) / 3600);
      if (dir2.toUpperCase() === "W") lng = -lng;
      return {
        lat,
        lng,
        zoom: 17,
        title: text,
        type: "dms"
      };
    }

    // 3. Google Maps Embed iframe or URL with !2d and !3d coords
    const embedMatch2d3d = text.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (embedMatch2d3d) {
      return {
        lat: parseFloat(embedMatch2d3d[2]),
        lng: parseFloat(embedMatch2d3d[1]),
        zoom: 17,
        title: "Google Maps Embed Location",
        type: "embed"
      };
    }

    const embedMatch3d4d = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (embedMatch3d4d) {
      return {
        lat: parseFloat(embedMatch3d4d[1]),
        lng: parseFloat(embedMatch3d4d[2]),
        zoom: 17,
        title: "Google Maps Embed Location",
        type: "embed"
      };
    }

    // 4. Standard Google Maps URL with @lat,lng,zoom
    const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)(?:,(\d+(?:\.\d+)?)z)?/);
    let extractedTitle = "";
    const placeMatch = text.match(/\/place\/([^/@?#]+)/);
    if (placeMatch && placeMatch[1]) {
      extractedTitle = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      // Check if place name is coordinates e.g. /place/17.385,78.486
      const subCoords = extractedTitle.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (subCoords && !atMatch) {
        return {
          lat: parseFloat(subCoords[1]),
          lng: parseFloat(subCoords[2]),
          zoom: 17,
          title: extractedTitle,
          type: "place_coords"
        };
      }
    }

    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      const zoom = atMatch[3] ? Math.min(19, Math.max(14, Math.round(parseFloat(atMatch[3])))) : 17;
      return {
        lat,
        lng,
        zoom,
        title: extractedTitle || `Site (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
        type: "gmaps_at"
      };
    }

    // 5. Query param q=lat,lng or ll=lat,lng or sll=lat,lng
    const qCoordMatch = text.match(/[?&](?:q|ll|sll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qCoordMatch) {
      return {
        lat: parseFloat(qCoordMatch[1]),
        lng: parseFloat(qCoordMatch[2]),
        zoom: 17,
        title: extractedTitle || `Location (${qCoordMatch[1]}, ${qCoordMatch[2]})`,
        type: "gmaps_query_coord"
      };
    }

    // 6. Query param q=Place+Name
    const qPlaceMatch = text.match(/[?&]q=([^&#]+)/);
    if (qPlaceMatch && qPlaceMatch[1]) {
      const title = decodeURIComponent(qPlaceMatch[1].replace(/\+/g, " "));
      return {
        query: title,
        title: title,
        type: "search_query"
      };
    }

    // 7. Search URL /search/Place+Name
    const searchMatch = text.match(/\/search\/([^/@?#]+)/);
    if (searchMatch && searchMatch[1]) {
      const title = decodeURIComponent(searchMatch[1].replace(/\+/g, " "));
      return {
        query: title,
        title: title,
        type: "search_url"
      };
    }

    // 8. Shortened link: maps.app.goo.gl or goo.gl/maps
    if (text.includes("maps.app.goo.gl") || text.includes("goo.gl/maps")) {
      return {
        isShortUrl: true,
        url: text,
        title: "Google Maps Shared Link",
        type: "short_url"
      };
    }

    // 9. Default: treat as address query
    return {
      query: text,
      title: text,
      type: "address"
    };
  }

  /**
   * Geocode an address/query to lat/lng using OpenStreetMap Nominatim
   */
  static async geocodeAddress(query) {
    if (!query || typeof query !== "string") return null;
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=1`;
      const resp = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name
        };
      }
    } catch (e) {
      console.warn("Geocoding failed for query:", query, e);
    }
    return null;
  }

  /**
   * Converts lat/lng and zoom level to world pixel coordinate (Web Mercator)
   */
  static latLngToWorldPixel(lat, lng, zoom) {
    const scale = 256 * (1 << zoom);
    const x = ((lng + 180) / 360) * scale;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
    const y = (0.5 - (mercN / (2 * Math.PI))) * scale;
    return { x, y };
  }

  /**
   * Loads a tile image with caching and error handling
   */
  static loadTile(url) {
    if (this.tileCache.has(url)) {
      return Promise.resolve(this.tileCache.get(url));
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        MapEngine.tileCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        resolve(null); // Continue even if one tile fails
      };
      img.src = url;
    });
  }

  /**
   * Generates a high-resolution Satellite Map image from lat/lng via HTML5 Canvas
   * 
   * Uses Esri World Imagery (ArcGIS Satellite Map) which is high-resolution,
   * completely free, and CORS-enabled for client-side canvas snapshotting.
   */
  static async generateSatelliteMap({
    lat = 17.385044,
    lng = 78.486671,
    zoom = 17,
    width = 640,
    height = 340,
    title = "",
    showCrosshair = true,
    showHud = true
  } = {}) {
    const cacheKey = `${lat.toFixed(5)}_${lng.toFixed(5)}_${zoom}_${width}x${height}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Dark background while rendering
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    // Calculate center world pixel
    const center = this.latLngToWorldPixel(lat, lng, zoom);
    const minX = center.x - width / 2;
    const maxX = center.x + width / 2;
    const minY = center.y - height / 2;
    const maxY = center.y + height / 2;

    const minTileX = Math.floor(minX / 256);
    const maxTileX = Math.floor(maxX / 256);
    const minTileY = Math.floor(minY / 256);
    const maxTileY = Math.floor(maxY / 256);

    const tilePromises = [];
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        // Esri Satellite Tile URL
        const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
        const dx = Math.round(tx * 256 - minX);
        const dy = Math.round(ty * 256 - minY);

        tilePromises.push(
          this.loadTile(esriUrl).then(img => ({ img, dx, dy, tx, ty }))
        );
      }
    }

    const loadedTiles = await Promise.all(tilePromises);
    let successfulTiles = 0;

    // Draw all satellite tiles onto canvas
    loadedTiles.forEach(({ img, dx, dy }) => {
      if (img) {
        ctx.drawImage(img, dx, dy, 256, 256);
        successfulTiles++;
      }
    });

    // Fallback: If no satellite tiles loaded (e.g. offline), draw sleek digital grid
    if (successfulTiles === 0) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    const centerX = width / 2;
    const centerY = height / 2;

    // Draw Solar Rooftop Target Pin & Crosshairs
    if (showCrosshair) {
      // Subtle crosshair lines
      ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 45);
      ctx.lineTo(centerX, centerY - 16);
      ctx.moveTo(centerX, centerY + 16);
      ctx.lineTo(centerX, centerY + 45);
      ctx.moveTo(centerX - 45, centerY);
      ctx.lineTo(centerX - 16, centerY);
      ctx.moveTo(centerX + 16, centerY);
      ctx.lineTo(centerX + 45, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing outer target ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center solid red dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rooftop Target Tooltip
      const tagText = "⚡ Solar Site";
      ctx.font = "bold 10px sans-serif";
      const textWidth = ctx.measureText(tagText).width;
      const tagW = textWidth + 14;
      const tagH = 18;
      const tagX = centerX - tagW / 2;
      const tagY = centerY - 38;

      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fef08a";
      ctx.fillText(tagText, tagX + 7, tagY + 13);
    }

    // Top-Left Satellite Badge
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(10, 10, 140, 24, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(20, 22, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 10.5px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("SATELLITE VIEW (HD)", 28, 26);

    // Bottom HUD overlay
    if (showHud) {
      const hudHeight = 30;
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, height - hudHeight, width, hudHeight);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - hudHeight);
      ctx.lineTo(width, height - hudHeight);
      ctx.stroke();

      const coordStr = `GPS: ${lat >= 0 ? lat.toFixed(5) + '° N' : Math.abs(lat).toFixed(5) + '° S'}, ${lng >= 0 ? lng.toFixed(5) + '° E' : Math.abs(lng).toFixed(5) + '° W'} • Zoom: ${zoom}x`;
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(coordStr, 12, height - 11);

      if (title) {
        ctx.font = "600 10.5px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        const maxTitleW = width - 260;
        let displayTitle = title;
        if (ctx.measureText(displayTitle).width > maxTitleW) {
          while (displayTitle.length > 5 && ctx.measureText(displayTitle + "...").width > maxTitleW) {
            displayTitle = displayTitle.slice(0, -1);
          }
          displayTitle += "...";
        }
        const titleW = ctx.measureText(displayTitle).width;
        ctx.fillText(displayTitle, width - titleW - 12, height - 11);
      }
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    this.imageCache.set(cacheKey, dataUrl);
    return dataUrl;
  }

  /**
   * Main resolution method: takes raw user input or quote state and generates
   * the satellite map snapshot and metadata.
   */
  static async resolveAndGenerateMap(rawInput, fallbackAddress = "Hyderabad, India", zoom = 17) {
    const input = (rawInput || "").trim();
    let parsed = this.parseLocation(input);

    let lat = 17.385044;
    let lng = 78.486671;
    let resolvedTitle = "Project Site";
    let statusText = "Ready";

    if (parsed) {
      if (parsed.lat !== undefined && parsed.lng !== undefined) {
        lat = parsed.lat;
        lng = parsed.lng;
        resolvedTitle = parsed.title || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        statusText = `Satellite Map active for coordinates (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
      } else if (parsed.query) {
        resolvedTitle = parsed.query;
        statusText = `Geocoding address: ${parsed.query}...`;
        const geo = await this.geocodeAddress(parsed.query);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          resolvedTitle = parsed.query;
          statusText = `Location found: ${geo.displayName.split(",").slice(0, 3).join(",")}`;
        } else {
          // Fallback to billing address or default coords
          statusText = `Could not geocode "${parsed.query}". Using default satellite coordinates.`;
        }
      } else if (parsed.isShortUrl) {
        statusText = `Short link detected. Please click 'Detect Coordinates' or enter site address.`;
        // Geocode fallback address
        const geo = await this.geocodeAddress(fallbackAddress);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          resolvedTitle = fallbackAddress;
        }
      }
    } else if (fallbackAddress) {
      resolvedTitle = fallbackAddress;
      const geo = await this.geocodeAddress(fallbackAddress);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        resolvedTitle = fallbackAddress;
      }
    }

    const dataUrl = await this.generateSatelliteMap({
      lat,
      lng,
      zoom,
      width: 640,
      height: 340,
      title: resolvedTitle
    });

    return {
      success: true,
      dataUrl,
      lat,
      lng,
      zoom,
      title: resolvedTitle,
      statusText,
      coordinatesText: `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`
    };
  }
}
