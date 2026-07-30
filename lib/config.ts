// V MVP fazi pracujeme jen s jednou aktivni firmou (MKD Enterprise, s.r.o.).
// Az bude potreba vyber firmy v UI, nahradi se za hodnotu z session / URL parametru.
export const DEFAULT_COMPANY_ID =
  process.env.NEXT_PUBLIC_DEFAULT_COMPANY_ID ??
  "11111111-1111-1111-1111-111111111111";
