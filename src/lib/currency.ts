import { supabase } from "@/integrations/supabase/client";

let cachedCurrency = "$";
let cachedSymbol = "$";

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  KES: "KSh",
  ZAR: "R",
};

export const getCurrencySymbol = async (): Promise<string> => {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "currency")
      .maybeSingle();
    
    if (data?.value) {
      cachedCurrency = data.value as string;
      cachedSymbol = currencySymbols[cachedCurrency] || cachedCurrency;
    }
  } catch (error) {
    console.error("Error fetching currency:", error);
  }
  
  return cachedSymbol;
};

export const formatCurrency = (amount: number, symbol?: string): string => {
  const currencySymbol = symbol || cachedSymbol;
  return `${currencySymbol}${amount.toFixed(2)}`;
};

// Initialize currency on module load
getCurrencySymbol();
