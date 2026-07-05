import {
  FiHome,
  FiMap,
  FiUser,
  FiPlusCircle,
} from "react-icons/fi";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof FiHome;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: FiHome },
  { label: "My Trips", href: "/trips", icon: FiMap },
  { label: "Profile", href: "/profile", icon: FiUser },
];

export const QUICK_ACTIONS = [
  { label: "New Trip", href: "/trips/new", icon: FiPlusCircle },
];
