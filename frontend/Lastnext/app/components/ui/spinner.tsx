import React from 'react';

interface SpinnerProps {
  size?: number; // Optional size prop to customize spinner size
}

const Spinner: React.FC<SpinnerProps> = ({ size = 24 }) => {
  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        border: '2px solid transparent',
        borderTop: '2px solid currentColor',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );
};

export default Spinner;
