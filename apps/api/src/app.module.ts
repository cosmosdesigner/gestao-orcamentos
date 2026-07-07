import { Module } from "@nestjs/common";
import { AssistantController } from "./assistant.controller";
import { BudgetRequestsController } from "./budget-requests.controller";
import { BudgetRequestsService } from "./budget-requests.service";
import { DatabaseService } from "./database.service";

@Module({
  controllers: [AssistantController, BudgetRequestsController],
  providers: [DatabaseService, BudgetRequestsService],
})
export class AppModule {}
