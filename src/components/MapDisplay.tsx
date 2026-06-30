import React, { useRef, useCallback, useEffect } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';

interface MapDisplayProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -20.0,
  lng: -60.0,
};

export function MapDisplay({ latitude, longitude }: MapDisplayProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = latitude && longitude ? { lat: latitude, lng: longitude } : defaultCenter;
  const zoom = latitude && longitude ? 15 : 2;

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.panTo({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {latitude && longitude && (
        <MarkerF
          position={{ lat: latitude, lng: longitude }}
        />
      )}
    </GoogleMap>
  );
}
