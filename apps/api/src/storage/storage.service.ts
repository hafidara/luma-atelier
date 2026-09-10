import { Injectable, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Order, Product } from "../models";
import { orders, products } from "./seeds";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly directory =
    process.env.DATA_DIR || resolve(__dirname, "../../data");
  private queue: Promise<void> = Promise.resolve();

  async onModuleInit() {
    await mkdir(this.directory, { recursive: true });
    await this.initialize("products.json", products);
    await this.initialize("orders.json", orders);
  }

  private async initialize(file: string, seed: unknown) {
    try {
      // Existing files, including invalid JSON, must never be silently replaced.
      await readFile(join(this.directory, file), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await this.atomicWrite(file, seed);
    }
  }

  private async read<T>(file: string): Promise<T> {
    return JSON.parse(await readFile(join(this.directory, file), "utf8")) as T;
  }

  readProducts() {
    return this.read<Product[]>("products.json");
  }
  readOrders() {
    return this.read<Order[]>("orders.json");
  }

  updateOrders<T>(
    update: (current: Order[]) => { orders: Order[]; result: T },
  ): Promise<T> {
    // The entire read-modify-write is queued, so concurrent requests cannot reuse IDs.
    const operation = this.queue.then(async () => {
      const next = update(await this.readOrders());
      await this.atomicWrite("orders.json", next.orders);
      return next.result;
    });
    // A failed write must not poison the queue for subsequent requests.
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async atomicWrite(file: string, data: unknown) {
    const destination = join(this.directory, file);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      // Same-directory rename publishes complete JSON; readers see old or new data.
      await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", {
        flag: "wx",
      });
      await rename(temporary, destination);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }
}
