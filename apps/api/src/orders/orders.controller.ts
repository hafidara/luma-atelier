import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get()
  findPage(@Query("page") page: unknown) {
    return this.orders.findPage(page);
  }
  @Post()
  create(@Body() input: CreateOrderDto) {
    return this.orders.create(input);
  }
}
