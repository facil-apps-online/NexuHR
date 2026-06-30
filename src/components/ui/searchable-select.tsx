import React from 'react';
import Select, { StylesConfig } from 'react-select';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: SearchableSelectOption | null;
  onChange: (value: SearchableSelectOption | null) => void;
  placeholder?: string;
  isClearable?: boolean;
}

const customStyles: StylesConfig<SearchableSelectOption, false> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: 'transparent',
    borderColor: 'hsl(var(--input))',
    borderRadius: 'var(--radius)',
    minHeight: '40px',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'hsl(var(--input))',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 8px',
  }),
  input: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'hsl(var(--muted-foreground))',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'hsl(var(--foreground))',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    borderRadius: 'var(--radius)',
    zIndex: 50,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? 'hsl(var(--primary))' : state.isFocused ? 'hsl(var(--accent))' : 'transparent',
    color: state.isSelected ? 'hsl(var(--primary-foreground))' : 'inherit',
    '&:active': {
      backgroundColor: 'hsl(var(--accent))',
    },
  }),
};

export function SearchableSelect({ options, value, onChange, placeholder, isClearable = true }: SearchableSelectProps) {
  return (
    <Select
      styles={customStyles}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isClearable={isClearable}
      noOptionsMessage={() => "No se encontraron opciones"}
    />
  );
}
