import { FiBriefcase, FiHome, FiUser } from "react-icons/fi";

export interface NavItem {
  label: string;
  /** Label on the slim rail and the phone tab bar. */
  shortLabel?: string;
  href: string;
  icon: typeof FiHome;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: FiHome },
  { label: "My trips", shortLabel: "Trips", href: "/trips", icon: FiBriefcase },
  { label: "Profile", href: "/profile", icon: FiUser },
];
