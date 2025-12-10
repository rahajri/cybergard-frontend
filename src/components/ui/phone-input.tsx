'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Country {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'FR', name: 'France', dial_code: '+33', flag: '🇫🇷' },
  { code: 'MA', name: 'Maroc', dial_code: '+212', flag: '🇲🇦' },
  { code: 'BE', name: 'Belgique', dial_code: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dial_code: '+41', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', dial_code: '+1', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', dial_code: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', dial_code: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', dial_code: '+49', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', dial_code: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italie', dial_code: '+39', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', dial_code: '+351', flag: '🇵🇹' },
  { code: 'LU', name: 'Luxembourg', dial_code: '+352', flag: '🇱🇺' },
  { code: 'TN', name: 'Tunisie', dial_code: '+216', flag: '🇹🇳' },
  { code: 'DZ', name: 'Algérie', dial_code: '+213', flag: '🇩🇿' },
  { code: 'SN', name: 'Sénégal', dial_code: '+221', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', dial_code: '+225', flag: '🇨🇮' },
];

interface PhoneInputProps {
  value?: string;
  onChange: (phone: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export default function PhoneInput({
  value = '',
  onChange,
  label = 'Numéro de téléphone',
  placeholder = '612345678',
  required = false,
  error
}: PhoneInputProps) {
  // Extraire l'indicatif et le numéro du format +33612345678
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (value && value.startsWith('+')) {
      const country = COUNTRIES.find(c => value.startsWith(c.dial_code));
      return country || COUNTRIES[0]; // France par défaut
    }
    return COUNTRIES[0]; // France par défaut
  });

  const [phoneNumber, setPhoneNumber] = useState<string>(() => {
    if (value && value.startsWith('+')) {
      const country = COUNTRIES.find(c => value.startsWith(c.dial_code));
      if (country) {
        return value.slice(country.dial_code.length);
      }
    }
    return value;
  });

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      // Mettre à jour le téléphone complet
      const fullPhone = phoneNumber ? `${country.dial_code}${phoneNumber}` : '';
      onChange(fullPhone);
    }
  };

  const handlePhoneChange = (number: string) => {
    // Enlever tous les caractères non numériques
    const cleanNumber = number.replace(/\D/g, '');
    setPhoneNumber(cleanNumber);

    // Mettre à jour le téléphone complet
    const fullPhone = cleanNumber ? `${selectedCountry.dial_code}${cleanNumber}` : '';
    onChange(fullPhone);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="phone-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="flex gap-2">
        {/* Sélecteur d'indicatif */}
        <div className="w-40">
          <select
            value={selectedCountry.code}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.dial_code}
              </option>
            ))}
          </select>
        </div>

        {/* Champ de saisie du numéro */}
        <div className="flex-1 relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="phone-input"
            type="tel"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={placeholder}
            className={`pl-10 ${error ? 'border-red-500' : ''}`}
          />
        </div>
      </div>

      {/* Affichage du numéro complet */}
      {phoneNumber && (
        <p className="text-xs text-gray-500">
          Format international : <span className="font-mono">{selectedCountry.dial_code}{phoneNumber}</span>
        </p>
      )}

      {/* Message d'erreur */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
