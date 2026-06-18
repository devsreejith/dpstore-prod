interface LoaderProps {
  text?: string;
  description?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function Loader({
  text,
  description,
  className = '',
  size = 'large',
}: LoaderProps) {
  // Size classes for the outer circle and spinner
  let outerCircleSize = 'w-20 h-20';
  let spinnerSize = 'w-12 h-12 border-[3.5px]';
  let textClass = 'text-base md:text-lg';
  let descClass = 'text-xs md:text-sm';
  let containerPadding = 'py-16';
  let minHeightClass = 'min-h-[450px]';

  if (size === 'small') {
    outerCircleSize = 'w-10 h-10';
    spinnerSize = 'w-6 h-6 border-[2px]';
    textClass = 'text-xs md:text-sm';
    containerPadding = 'py-4';
    minHeightClass = '';
  } else if (size === 'medium') {
    outerCircleSize = 'w-14 h-14';
    spinnerSize = 'w-9 h-9 border-[3px]';
    textClass = 'text-sm md:text-base';
    containerPadding = 'py-8';
    minHeightClass = 'min-h-[200px]';
  }

  return (
    <div className={`flex flex-col items-center justify-center ${minHeightClass} ${containerPadding} text-center font-body ${className}`}>
      <div className="relative mb-4 flex items-center justify-center">
        {/* Subtle pulsating outer circle */}
        <div className={`absolute ${outerCircleSize} border border-gray-150 rounded-full animate-ping opacity-70`}></div>
        {/* Main spinning ring */}
        <div className={`${spinnerSize} border-gray-150 border-t-heading rounded-full animate-spin relative z-10`}></div>
      </div>
      {text && (
        <h2 className={`${textClass} font-bold text-heading mb-1`}>
          {text}
        </h2>
      )}
      {description && (
        <p className={`${descClass} text-gray-500 max-w-sm px-4 leading-relaxed`}>
          {description}
        </p>
      )}
    </div>
  );
}
