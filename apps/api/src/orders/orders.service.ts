import { BadRequestException, Injectable } from "@nestjs/common";
import { StorageService } from "../storage/storage.service";
import { ProductsService } from "../products/products.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Order } from "../models";

@Injectable()
export class OrdersService {
  constructor(
    private readonly storage: StorageService,
    private readonly products: ProductsService,
  ) {}

  async create(input: CreateOrderDto) {
    const product = (await this.products.findAll()).find(
      (item) => item.id === input.productId,
    );
    if (!product) throw new BadRequestException("Unknown product.");
    if (!product.colours.some((colour) => colour.name === input.colour)) {
      throw new BadRequestException(
        "Choose a colour available for this product.",
      );
    }
    return this.storage.updateOrders((current) => {
      const id = current.reduce((max, order) => Math.max(max, order.id), 0) + 1;
      const order: Order = {
        id,
        productId: product.id,
        email: input.email,
        colour: input.colour,
        quantity: input.quantity,
        unitPriceCents: product.priceCents,
        totalCents: product.priceCents * input.quantity,
        createdAt: new Date().toISOString(),
      };
      return { orders: [...current, order], result: order };
    });
  }

  async findPage(value: unknown) {
    if (
      value !== undefined &&
      (typeof value !== "string" || !/^[1-9]\d*$/.test(value))
    ) {
      throw new BadRequestException("Page must be a positive integer.");
    }
    const page = value === undefined ? 1 : Number(value);
    if (!Number.isSafeInteger(page))
      throw new BadRequestException("Page must be a safe integer.");
    const orders = await this.storage.readOrders();
    orders.sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id,
    );
    const pageSize = 3;
    const offset = (page - 1) * pageSize;
    return {
      items: orders.slice(offset, offset + pageSize),
      total: orders.length,
      page,
      pageSize,
    };
  }
}
