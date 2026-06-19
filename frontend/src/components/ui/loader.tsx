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
  let outerCircleSize = 'w-20 h-20 lg:w-28 lg:h-28';
  let spinnerSize = 'w-12 h-12 border-[3.5px] lg:w-16 lg:h-16 lg:border-[4px]';
  let textClass = 'text-base md:text-lg lg:text-xl';
  let descClass = 'text-xs md:text-sm lg:text-base';
  let containerPadding = 'py-16 lg:py-24';
  let minHeightClass = 'min-h-[450px] lg:min-h-[600px]';

  if (size === 'small') {
    outerCircleSize = 'w-10 h-10 lg:w-14 lg:h-14';
    spinnerSize = 'w-6 h-6 border-[2px] lg:w-9 lg:h-9 lg:border-[3px]';
    textClass = 'text-xs md:text-sm lg:text-base';
    containerPadding = 'py-4 lg:py-8';
    minHeightClass = '';
  } else if (size === 'medium') {
    outerCircleSize = 'w-14 h-14 lg:w-20 lg:h-20';
    spinnerSize = 'w-9 h-9 border-[3px] lg:w-12 lg:h-12 lg:border-[3.5px]';
    textClass = 'text-sm md:text-base lg:text-lg';
    containerPadding = 'py-8 lg:py-16';
    minHeightClass = 'min-h-[200px] lg:min-h-[300px]';
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
