import { Body, Controller, Post } from "@nestjs/common";
import { BudgetRequestsService } from "./budget-requests.service";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly service: BudgetRequestsService) {}

  @Post("ask")
  async ask(@Body() body: { question: string }) {
    return { answer: await this.service.answerQuestion(body.question ?? "") };
  }
}
