import { prisma } from '@/lib/prisma'

/**
 * Check if a user has access to a customer.
 * Admins have access to all customers.
 * Non-admins only have access to assigned customers.
 */
export async function hasCustomerAccess(
  userId: string,
  userRole: string,
  customerId: string
): Promise<boolean> {
  // Admins have access to all customers
  if (userRole === 'Admin') {
    return true
  }

  // Check if user is assigned to this customer
  const assignment = await prisma.userCustomer.findUnique({
    where: { userId_customerId: { userId, customerId } },
  })

  return !!assignment
}
