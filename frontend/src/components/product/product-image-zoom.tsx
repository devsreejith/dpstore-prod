import React, { useRef, useState, useCallback, useEffect } from "react";

interface ProductImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  zoomScale?: number;
}

const ProductImageZoom: React.FC<ProductImageZoomProps> = ({
  src,
  alt,
  className = "",
  zoomScale = 2.5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [backgroundPosition, setBackgroundPosition] = useState("center");
  const [imgLoaded, setImgLoaded] = useState(false);

  // Mobile pinch-to-zoom state
  const [mobileZoom, setMobileZoom] = useState(1);
  const [mobileOrigin, setMobileOrigin] = useState({ x: 50, y: 50 });
  const lastPinchDist = useRef(0);
  const lastTap = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1025);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Reset zoom when src changes
  useEffect(() => {
    setIsZoomed(false);
    setMobileZoom(1);
    setImgLoaded(false);
  }, [src]);

  // ── Desktop: Hover-to-zoom ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setBackgroundPosition(`${x}% ${y}%`);
    },
    [isMobile]
  );

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) setIsZoomed(true);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsZoomed(false);
      setBackgroundPosition("center");
    }
  }, [isMobile]);

  // ── Mobile: Pinch-to-zoom + double-tap ──
  const getPinchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobile || !containerRef.current) return;

      // Double-tap detection
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          e.preventDefault();
          if (mobileZoom > 1) {
            setMobileZoom(1);
            setMobileOrigin({ x: 50, y: 50 });
          } else {
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
            const y = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
            setMobileOrigin({ x, y });
            setMobileZoom(zoomScale);
          }
        }
        lastTap.current = now;
      }

      // Pinch start
      if (e.touches.length === 2) {
        e.preventDefault();
        lastPinchDist.current = getPinchDistance(e.touches);
      }
    },
    [isMobile, mobileZoom, zoomScale]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobile || !containerRef.current) return;

      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getPinchDistance(e.touches);
        if (lastPinchDist.current > 0) {
          const delta = dist / lastPinchDist.current;
          setMobileZoom((prev) => {
            const next = prev * delta;
            return Math.min(Math.max(next, 1), zoomScale * 1.5);
          });

          // Update origin to pinch midpoint
          const rect = containerRef.current.getBoundingClientRect();
          const mx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width * 100;
          const my = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) / rect.height * 100;
          setMobileOrigin({ x: mx, y: my });
        }
        lastPinchDist.current = dist;
      }
    },
    [isMobile, zoomScale]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobile) return;
      lastPinchDist.current = 0;
      // If zoom is close to 1, snap back
      if (mobileZoom < 1.15) {
        setMobileZoom(1);
        setMobileOrigin({ x: 50, y: 50 });
      }
    },
    [isMobile, mobileZoom]
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-crosshair select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: mobileZoom > 1 ? "none" : "pan-y" }}
    >
      {/* Base image (always visible) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain transition-opacity duration-200"
        style={{
          opacity: isZoomed ? 0 : 1,
          // Mobile pinch zoom applied via transform
          ...(isMobile
            ? {
                transform: `scale(${mobileZoom})`,
                transformOrigin: `${mobileOrigin.x}% ${mobileOrigin.y}%`,
                transition: mobileZoom === 1 ? "transform 0.3s ease-out" : "none",
              }
            : {}),
        }}
        onLoad={() => setImgLoaded(true)}
        draggable={false}
      />

      {/* Desktop zoom overlay using background-image for crisp zoom */}
      {!isMobile && imgLoaded && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: isZoomed ? 1 : 0,
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoomScale * 100}%`,
            backgroundPosition,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}

      {/* Zoom indicator icon */}
      {!isMobile && !isZoomed && imgLoaded && (
        <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md pointer-events-none transition-opacity duration-300">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#005844"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
      )}

      {/* Mobile zoom indicator */}
      {isMobile && mobileZoom > 1 && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full pointer-events-none">
          {mobileZoom.toFixed(1)}x
        </div>
      )}
    </div>
  );
};

export default ProductImageZoom;
