"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import type { NavItem } from "./NavBar";

interface MobileMenuDashboardProps {
  variant: "dashboard";
  items: NavItem[];
  links?: never;
}

interface MobileMenuMarketingProps {
  variant: "marketing";
  links: { href: string; label: string }[];
  items?: never;
}

type MobileMenuProps = MobileMenuDashboardProps | MobileMenuMarketingProps;

export function MobileMenu(props: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 -mr-2 text-charcoal"
        aria-label={isOpen ? "Stäng meny" : "Öppna meny"}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-64 bg-cream-light shadow-xl z-50 transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-cream-dark">
            <span className="font-serif font-bold text-charcoal">Meny</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-charcoal/70 hover:text-charcoal"
              aria-label="Stäng meny"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 py-4">
            {props.variant === "dashboard" && props.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive
                      ? "bg-fresh/10 text-fresh border-r-2 border-fresh"
                      : "text-charcoal/70 hover:bg-cream hover:text-charcoal"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            {props.variant === "marketing" && props.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-charcoal/70 hover:bg-cream hover:text-charcoal transition-colors"
              >
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
            {props.variant === "marketing" && (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-charcoal/70 hover:bg-cream hover:text-charcoal transition-colors"
              >
                <span className="font-medium">Logga in</span>
              </Link>
            )}
          </nav>

          {props.variant === "dashboard" && (
            <div className="p-4 border-t border-cream-dark">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
