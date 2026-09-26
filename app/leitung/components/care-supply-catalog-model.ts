"use client";

export type Product = {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  description: string | null;
  default_target_quantity: number;
  current_stock_quantity: number;
  status: "active" | "blocked" | "archived";
  created_at: string;
  updated_at: string;
};

export type Draft = {
  itemName: string;
  category: string;
  unit: string;
  description: string;
  defaultTargetQuantity: number;
  currentStockQuantity: number;
  status: Product["status"];
};

export const emptyDraft: Draft = {
  itemName: "",
  category: "Pflege & Hygiene",
  unit: "Stück",
  description: "",
  defaultTargetQuantity: 0,
  currentStockQuantity: 0,
  status: "active",
};

export const categories = [
  "Pflege & Hygiene",
  "Inkontinenz",
  "Mobilität",
  "Ernährung",
  "Mundpflege",
  "Hilfsmittel",
  "Sonstiges",
];

export const units = ["Stück", "Packung", "Flasche", "Tube", "Paar", "Rolle", "ml", "g"];
