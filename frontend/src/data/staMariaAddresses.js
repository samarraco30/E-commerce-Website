export const STA_MARIA_BARANGAYS = [
  'Bagbaguin',
  'Balasing',
  'Buenavista',
  'Bulac',
  'Bungahan',
  'Cay Pombo',
  'Caysio',
  'Catmon',
  'Guyong',
  'Lalakhan',
  'Mag-Asawang Sapa',
  'Mahabang Parang',
  'Manggahan',
  'Parada',
  'Poblacion',
  'Pulong Buhangin',
  'San Gabriel',
  'San Jose Patag',
  'San Vicente',
  'Santa Clara',
  'Santa Cruz',
  'Silangan',
  'Tabing Bakod',
  'Tumana'
]

export function addressToCheckoutDetails(address) {
  return {
    fullName: address.fullName,
    email: address.email || '',
    phone: address.phone,
    address: address.address,
    barangay: address.barangay,
    city: address.city,
    postalCode: address.postalCode,
    deliveryNotes: address.deliveryNotes || ''
  }
}
