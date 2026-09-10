import { Module } from "@nestjs/common";
import { StorageService } from "./storage/storage.service";
import { ProductsService } from "./products/products.service";
import { ProductsController } from "./products/products.controller";
import { OrdersService } from "./orders/orders.service";
import { OrdersController } from "./orders/orders.controller";

@Module({
  controllers: [ProductsController, OrdersController],
  providers: [StorageService, ProductsService, OrdersService],
})
export class AppModule {}
