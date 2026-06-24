import NextLink, { LinkProps as NextLinkProps } from "next/link";

interface LinkProps extends NextLinkProps {
    className?: string;
}

const getResolvedHref = (h: any) => {
    if (typeof h === 'string') {
        if (
            h.includes('/collections/latest-collections') ||
            h === 'collections/latest-collections' ||
            h.includes('/collections/latest') ||
            h === 'collections/latest' ||
            h.includes('/collections/search') ||
            h === 'collections/search'
        ) {
            return '/search';
        }
        return h;
    }
    if (h && typeof h === 'object') {
        const pathname = String(h.pathname || '');
        if (
            pathname.includes('/collections/latest-collections') ||
            pathname === 'collections/latest-collections' ||
            pathname.includes('/collections/latest') ||
            pathname === 'collections/latest' ||
            pathname.includes('/collections/search') ||
            pathname === 'collections/search'
        ) {
            return { ...h, pathname: '/search' };
        }
    }
    return h;
};

export default function Link({
    href,
    children,
    ...props
}: React.PropsWithChildren<LinkProps>) {
    return (
        <NextLink href={getResolvedHref(href)} {...props}>
            {children}
        </NextLink>
    );
}
