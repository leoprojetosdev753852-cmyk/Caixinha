'use client';

import { IMaskInput } from 'react-imask';

interface MoneyInputProps {
  value: string;
  onChange: (value: string, raw: number) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

/**
 * Input com máscara R$ que retorna valor em centavos no callback raw.
 */
export function MoneyInput({ value, onChange, placeholder, id, className }: MoneyInputProps) {
  return (
    <IMaskInput
      id={id}
      mask={Number}
      scale={2}
      thousandsSeparator="."
      radix=","
      padFractionalZeros
      normalizeZeros
      mapToRadix={['.']}
      unmask={false}
      prefix="R$ "
      value={value}
      onAccept={(_v: string, mask: any) => {
        const raw = Math.round(Number(mask.unmaskedValue || 0) * 100);
        onChange(mask.value, raw);
      }}
      placeholder={placeholder ?? 'R$ 0,00'}
      inputMode="numeric"
      className={
        className ??
        'flex h-12 w-full rounded-md border border-input bg-background px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      }
    />
  );
}
