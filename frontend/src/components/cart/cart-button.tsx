import { IoCartOutline } from 'react-icons/io5';
import { useCart } from '@contexts/cart/cart.context';
import { useUI } from '@contexts/ui.context';

interface CartButtonProps {
  asDiv?: boolean;
}

export default function CartButton({ asDiv = false }: CartButtonProps) {
  const { openCart } = useUI();
  const { totalItems } = useCart();
  
  const Component = asDiv ? 'div' : 'button';
  
  return (
    <Component
      className="relative flex items-center justify-center flex-shrink-0 h-auto transform focus:outline-none cursor-pointer"
      {...(!asDiv ? { onClick: openCart, 'aria-label': 'cart-button' } : {})}
    >
      <IoCartOutline className="w-5 h-auto text-heading hover:text-black transition-colors" />
      <span className="cart-counter-badge flex items-center justify-center bg-heading text-white absolute -top-2.5 xl:-top-3 rounded-full ltr:-right-2.5 ltr:xl:-right-3 rtl:-left-2.5 rtl:xl:-left-3 font-bold">
        {totalItems}
      </span>
    </Component>
  );
}
