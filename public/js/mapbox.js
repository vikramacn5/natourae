/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWFyazQiLCJhIjoiY2t0MTVma2c0MDc3djJucjJyYmY2M2x2bSJ9.de0t3ixNhUuXNOok-SovUA';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mark4/ckt16tqra0q3o18pbnej8kjg1',
    scrollZoom: false,
    // center: [-79.38394097321783, 43.6504618654015],
    // zoom: 10,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day: ${loc.day} ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
