import { usePathname } from "next/navigation";
import Link from "next/link";

const ActiveLink = ({
  children,
  className,
  activeClassName,
  href,
  ...props
}: any) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`${className} ${isActive ? activeClassName : ""}`}
      {...props}
    >
      {children}
    </Link>
  );
};

export default ActiveLink;
