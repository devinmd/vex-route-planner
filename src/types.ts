export interface Point {
  x: number;
  y: number;
  fieldX: number;
  fieldY: number;
  id: number;
  theta: number; // heading in degrees: 0=up, 90=right, 180=down, 270=left
  timeout: number; // in milliseconds, default 1000
  speed: number; // 1-127, default 70
  forwards: boolean; // true=forwards, false=backwards
}

export interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export interface IconButtonProps {
  onClick: () => void;
  iconSrc: string;
  text: string;
  isActive?: boolean;
  activeIconSrc?: string;
  size?: number;
}

export interface SelectInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}
