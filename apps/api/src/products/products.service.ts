import { Injectable } from "@nestjs/common";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ProductsService {
  constructor(private readonly storage: StorageService) {}
  findAll() {
    return this.storage.readProducts();
  }
}
