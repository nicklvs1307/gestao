import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '../../lib/utils';
import type { Coords } from '../../types';

// Fix para ícones do Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_COORDS: Coords = [-23.5505, -46.6333];

interface DeliveryMapProps {
  orderId: string;
  customerCoords: Coords | null;
  restaurantCoords: Coords | null;
  currentLocation: Coords | null;
  route: Coords[];
  className?: string;
}

const restaurantIcon = L.divIcon({
  html: `<div class="bg-slate-900 p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const customerIcon = L.divIcon({
  html: `<div class="bg-primary p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const driverIcon = L.divIcon({
  html: `<div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg text-white animate-pulse flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  orderId,
  customerCoords,
  restaurantCoords,
  currentLocation,
  route,
  className,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<{
    restaurant?: L.Marker;
    customer?: L.Marker;
    driver?: L.Marker;
  }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  // Inicializa o mapa uma vez
  useEffect(() => {
    if (!mapRef.current || leafletInstance.current) return;

    const center = currentLocation || restaurantCoords || DEFAULT_COORDS;
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    leafletInstance.current = map;

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza markers e rota quando coordenadas mudam
  useEffect(() => {
    const map = leafletInstance.current;
    if (!map) return;

    if (restaurantCoords) {
      if (markersRef.current.restaurant) {
        markersRef.current.restaurant.setLatLng(restaurantCoords);
      } else {
        markersRef.current.restaurant = L.marker(restaurantCoords, { icon: restaurantIcon }).addTo(map);
      }
    }

    if (customerCoords) {
      if (markersRef.current.customer) {
        markersRef.current.customer.setLatLng(customerCoords);
      } else {
        markersRef.current.customer = L.marker(customerCoords, { icon: customerIcon }).addTo(map);
      }
    }

    if (currentLocation) {
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng(currentLocation);
      } else {
        markersRef.current.driver = L.marker(currentLocation, { icon: driverIcon }).addTo(map);
      }
    }

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    if (route && route.length > 0) {
      polylineRef.current = L.polyline(route, {
        color: '#f97316',
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round',
      }).addTo(map);
      map.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
    }

    map.invalidateSize();
  }, [orderId, customerCoords, restaurantCoords, currentLocation, route]);

  return (
    <div
      ref={mapRef}
      className={cn('w-full h-full min-h-[300px]', className)}
    />
  );
};
