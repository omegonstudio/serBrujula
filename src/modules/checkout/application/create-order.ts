import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { clearCart, getCartSummary } from "@/modules/cart/application/cart-service";
import { getContent } from "@/modules/cms/application/content";

const checkoutSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  fulfillmentType: z.enum(["SHIPPING", "PICKUP"]),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

function orderNumber() {
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  return `SB-${stamp}-${nanoid(6).toUpperCase()}`;
}

export async function createOrderFromCart(raw: CheckoutInput) {
  const input = checkoutSchema.parse(raw);

  if (input.fulfillmentType === "SHIPPING") {
    if (!input.addressLine || !input.city) {
      throw new AppError("VALIDATION", "Completá la dirección de envío");
    }
  }

  const summary = await getCartSummary();
  const { cart, items, subtotalCents } = summary;
  if (!cart || items.length === 0) {
    throw new AppError("VALIDATION", "El carrito está vacío");
  }

  const shippingRaw = await getContent("shipping.flatCents", "0");
  const shippingCents =
    input.fulfillmentType === "SHIPPING" ? Number(shippingRaw) || 0 : 0;

  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      const inv = await tx.inventory.findUnique({
        where: { productId: item.productId },
      });
      const available = inv?.quantity ?? 0;
      if (!item.product.isActive || available < item.quantity) {
        throw new AppError(
          "STOCK",
          `Stock insuficiente para ${item.product.name}`,
        );
      }
    }

    const customer = await tx.customerProfile.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        phone: input.phone,
      },
    });

    const totalCents = subtotalCents + shippingCents;
    const order = await tx.order.create({
      data: {
        orderNumber: orderNumber(),
        customerProfileId: customer.id,
        email: input.email.toLowerCase(),
        status: "PENDING_PAYMENT",
        subtotalCents,
        shippingCents,
        totalCents,
        currency: "ARS",
        fulfillmentType: input.fulfillmentType,
        shippingAddress:
          input.fulfillmentType === "SHIPPING"
            ? {
                addressLine: input.addressLine,
                city: input.city,
                postalCode: input.postalCode ?? null,
              }
            : undefined,
        notes: input.notes,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            unitPriceCents: item.product.priceCents,
            quantity: item.quantity,
            lineTotalCents: item.product.priceCents * item.quantity,
          })),
        },
        statusHistory: {
          create: {
            toStatus: "PENDING_PAYMENT",
            note: "Pedido creado",
          },
        },
        shipment:
          input.fulfillmentType === "SHIPPING" || input.fulfillmentType === "PICKUP"
            ? {
                create: {
                  status: "PENDING",
                },
              }
            : undefined,
      },
      include: { items: true, payments: true },
    });

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        provider: process.env.MERCADOPAGO_ACCESS_TOKEN
          ? "MERCADO_PAGO"
          : "MANUAL",
        idempotencyKey: `order-${order.id}-pay`,
        status: "PENDING",
        amountCents: totalCents,
      },
    });

    return { order, payment, cartId: cart.id };
  }).then(async (result) => {
    await clearCart(result.cartId);
    return { order: result.order, payment: result.payment };
  });
}
