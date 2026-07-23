import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AssistantController } from "./assistant.controller";
import { BudgetRequestsController } from "./budget-requests.controller";
import { BudgetRequestsService } from "./budget-requests.service";
import { DatabaseService } from "./database.service";
import { ProjectsController } from "./projects.controller";

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: ".env" })],
  controllers: [AssistantController, BudgetRequestsController, ProjectsController],
  providers: [DatabaseService, BudgetRequestsService],
})
export class AppModule {}
