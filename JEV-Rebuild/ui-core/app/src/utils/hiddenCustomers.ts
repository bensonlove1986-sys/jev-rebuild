const KEY = 'jev_hidden_customers';

export function getHiddenCustomerIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function hideCustomer(customer_id: string) {
  const set = getHiddenCustomerIds();
  set.add(customer_id);
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function isCustomerHidden(customer_id: string): boolean {
  return getHiddenCustomerIds().has(customer_id);
}

export function removeFromHidden(customer_id: string) {
  const set = getHiddenCustomerIds();
  set.delete(customer_id);
  localStorage.setItem(KEY, JSON.stringify([...set]));
}