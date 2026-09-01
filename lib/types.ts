export type Role =
  | "farmer"
  | "pashu_mitra"
  | "vet"
  | "officer"
  | "lab"
  | "admin";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  phone: string | null;
  language_pref: "en" | "hi" | "mr";
  village: string | null;
  taluka: string | null;
  district: string | null;
  created_at: string;
}

export const ROLES: Role[] = [
  "farmer",
  "pashu_mitra",
  "vet",
  "officer",
  "lab",
  "admin",
];
