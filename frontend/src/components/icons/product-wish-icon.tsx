import React from "react";

interface ProductWishIconProps {
  className?: string;
  active?: boolean;
}

const ProductWishIcon: React.FC<ProductWishIconProps> = ({ className = "", active = false }) => {
  return (
    <svg
      viewBox="0 0 52 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {active ? (
        <path
          d="M26 29C26.5 29 27.5 28.2 29 26.9C33 23.4 37 19.4 37 15.5C37 12.5 34.5 10 31.5 10C29.5 10 27.5 11.2 26 13C24.5 11.2 22.5 10 20.5 10C17.5 10 15 12.5 15 15.5C15 19.4 19 23.4 23 26.9C24.5 28.2 25.5 29 26 29Z"
          fill="#EF4444"
        />
      ) : (
        <path
          d="M26 28.2C26.5 28.2 27.3 27.5 28.5 26.5C32.1 23.2 35.8 19.5 35.8 15.5C35.8 12.8 33.7 10.8 31 10.8C29 10.8 27.2 12 26 13.8C24.8 12 23 10.8 21 10.8C18.3 10.8 16.2 12.8 16.2 15.5C16.2 19.5 19.9 23.2 23.5 26.5C24.7 27.5 25.5 28.2 26 28.2Z"
          stroke="#212121"
          strokeWidth="1.0"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

export default ProductWishIcon;
