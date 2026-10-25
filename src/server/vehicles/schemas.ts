import { z } from 'zod';

const vehicleTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !value.includes('\0'));
const vehicleQuantitySchema = z.number().int().min(0).max(2147483647);

/** Validates the strict request body required for vehicle creation. */
export const vehicleBodySchema = z
  .object({
    make: vehicleTextSchema,
    model: vehicleTextSchema,
    category: vehicleTextSchema,
    price: z
      .number()
      .finite()
      .min(0)
      .max(9999999999.99)
      .refine(hasAtMostTwoDecimalPlaces, 'Price must have at most two decimal places'),
    quantity: vehicleQuantitySchema,
  })
  .strict();

/** Validates vehicle replacement fields while allowing stock to remain unchanged. */
export const vehicleUpdateBodySchema = vehicleBodySchema.extend({
  quantity: vehicleQuantitySchema.optional(),
});

/** Accepts no purchase fields, including an omitted request body. */
export const purchaseBodySchema = z
  .object({})
  .strict()
  .optional()
  .transform(() => ({}));

/** Validates a strict positive restock quantity within the PostgreSQL int4 range. */
export const restockBodySchema = z
  .object({ quantity: z.number().int().min(1).max(2147483647) })
  .strict();

/** Accepts a UUID identifier in a vehicle route. */
export const vehicleIdSchema = z.uuid();

const optionalSearchTextSchema = z
  .string()
  .trim()
  .refine((value) => !value.includes('\0'))
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const optionalPriceFilterSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value === '' ? undefined : value))
  .pipe(
    z.union([
      z.undefined(),
      z
        .string()
        .regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/, 'Price filters must be non-negative numbers')
        .transform(Number),
    ]),
  )
  .pipe(z.number().finite().min(0).optional());

/** Validates the strict, optional query filters accepted by vehicle search. */
export const vehicleSearchQuerySchema = z
  .object({
    make: optionalSearchTextSchema,
    model: optionalSearchTextSchema,
    category: optionalSearchTextSchema,
    minPrice: optionalPriceFilterSchema,
    maxPrice: optionalPriceFilterSchema,
  })
  .strict()
  .superRefine((filters, context) => {
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      if (filters.minPrice > filters.maxPrice) {
        context.addIssue({
          code: 'custom',
          path: ['minPrice'],
          message: 'Minimum price must not exceed maximum price',
        });
      }
    }
  });

export type VehicleBody = z.infer<typeof vehicleBodySchema>;
export type VehicleUpdateBody = z.infer<typeof vehicleUpdateBodySchema>;
export type VehicleSearchQuery = z.infer<typeof vehicleSearchQuerySchema>;
export type RestockBody = z.infer<typeof restockBodySchema>;

/** Confirms a JavaScript price has no more than two meaningful decimal places. */
function hasAtMostTwoDecimalPlaces(price: number): boolean {
  return Number(price.toFixed(2)) === price;
}
