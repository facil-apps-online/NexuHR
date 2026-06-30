import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { usePhonePrefixes } from '@/hooks/usePhonePrefixes';
import { useCountries } from '@/hooks/useCountries';
import { Input } from '@/components/ui/input';

interface PhoneInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  defaultCountryIsoCode?: string | null;
  placeholderType?: 'fijo' | 'movil';
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, defaultCountryIsoCode, placeholderType = 'movil' }, ref) => {
    const { data: prefixes } = usePhonePrefixes();
    const { data: countries } = useCountries();

    const [currentNumber, setCurrentNumber] = useState('');

    const dynamicPlaceholder = useMemo(() => {
      if (!countries || !defaultCountryIsoCode) {
        return "300 123 4567"; // Default fallback
      }
      const country = countries.find(c => c.iso_code === defaultCountryIsoCode);
      const phonePlaceholders = country?.field_placeholders?.phone;
      if (!phonePlaceholders) {
        return "300 123 4567";
      }
      const placeholder = phonePlaceholders.find(p => p.label === placeholderType);
      return placeholder?.value || phonePlaceholders[0]?.value || "300 123 4567";
    }, [countries, defaultCountryIsoCode, placeholderType]);

    const defaultPrefix = useMemo(() => {
        if (!prefixes) return '';
        const country = defaultCountryIsoCode
          ? prefixes.find(p => p.iso_code === defaultCountryIsoCode)
          : prefixes.find(p => p.prefix === '+1') || prefixes[0];
        return country?.prefix || '';
    }, [defaultCountryIsoCode, prefixes]);


    useEffect(() => {
        if (value) {
            setCurrentNumber(value);
        } else {
            setCurrentNumber('');
        }
    }, [value]);

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newNumber = e.target.value;
      setCurrentNumber(newNumber);

      if (newNumber.startsWith('+')) {
        onChange(newNumber);
      } else {
        onChange(`${defaultPrefix} ${newNumber}`);
      }
    };

    return (
        <Input
          type="tel"
          value={currentNumber}
          onChange={handleNumberChange}
          placeholder={dynamicPlaceholder}
          ref={ref}
        />
    );
  }
);

PhoneInput.displayName = "PhoneInput";