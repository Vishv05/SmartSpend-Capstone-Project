export const formatCurrency = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return value || "--";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numberValue);
};
