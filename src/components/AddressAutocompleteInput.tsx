import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface AddressAutocompleteInputProps {
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  defaultValue?: string;
  countryRestriction?: string;
  isGlobalSearch?: boolean;
}

export function AddressAutocompleteInput({ 
  onPlaceSelected, 
  defaultValue, 
  countryRestriction, 
  isGlobalSearch = false 
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  

  useEffect(() => {
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['address_components', 'geometry', 'formatted_address'],
    };

    if (countryRestriction) {
      options.componentRestrictions = { country: countryRestriction };
    }

    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, options);
    autocompleteRef.current = autocomplete;

    if (defaultValue) {
      inputRef.current.value = defaultValue;
    }

    const handlePlaceChanged = () => {
      const place = autocomplete.getPlace();
      if (place && place.geometry) {
        onPlaceSelected(place);
        if (inputRef.current) {
          inputRef.current.value = place.formatted_address || '';
        }
      }
    };

    autocomplete.addListener('place_changed', handlePlaceChanged);

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [countryRestriction, defaultValue, onPlaceSelected]);

  const getPlaceholder = () => {
    if (isGlobalSearch) return "Buscar dirección...";
    if (countryRestriction) return "Buscar dirección en el país seleccionado...";
    return "Selecciona un país para buscar...";
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={getPlaceholder()}
      disabled={!isGlobalSearch && !countryRestriction}
      autoComplete="off"
    />
  );
}