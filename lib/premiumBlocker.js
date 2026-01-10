export function triggerPremiumBlock(reason = "general") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("miadmi:premium-block", { detail: { reason } }));
}
