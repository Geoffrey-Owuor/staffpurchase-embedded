// Matches a discount policy for a product, based on its fetched item name
// (brand), item status (New/RHD2), and the purchase's payment terms.
//
// `resolved: false` means one of the required inputs isn't known yet (e.g.
// Item Status or Payment Terms hasn't been chosen), which callers use to
// distinguish "discount not yet knowable" from "known and happens to be 0%".
export function resolveDiscountPolicy({
  itemName,
  itemStatus,
  paymentTerms,
  discountPolicies,
}) {
  if (!paymentTerms || !itemName || !itemStatus || !discountPolicies) {
    return { resolved: false, policyRate: 0, productPolicy: "" };
  }

  let policyPaymentType = "";
  if (paymentTerms === "CASH") {
    policyPaymentType = "on Cash Payment";
  } else if (paymentTerms === "CREDIT" || paymentTerms === "CASH AND CREDIT") {
    policyPaymentType = "on Account";
  }

  let policyBrand = "Non Von Hotpoint";
  const itemNameLower = itemName.toLowerCase();
  if (itemNameLower.startsWith("von")) {
    policyBrand = "Von Hotpoint";
  } else if (itemNameLower.startsWith("samsung")) {
    policyBrand = "Samsung Brand";
  }

  const fullPolicyName = `${policyBrand} ${policyPaymentType}`;
  const matchedPolicy = discountPolicies.find(
    (policy) =>
      policy.policy_name === fullPolicyName && policy.category === itemStatus,
  );

  return {
    resolved: true,
    policyRate: matchedPolicy ? matchedPolicy.rate : 0,
    productPolicy: matchedPolicy ? matchedPolicy.policy_name : "",
  };
}
