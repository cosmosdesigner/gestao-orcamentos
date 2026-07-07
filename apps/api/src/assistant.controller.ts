import { Body, Controller, Post } from "@nestjs/common";
import { BudgetRequestsService } from "./budget-requests.service";

@Controller("assistant")
export class AssistantController {
  constructor(private readonly service: BudgetRequestsService) {}

  @Post("ask")
  ask(@Body() body: { question: string }) {
    return { answer: this.service.answerQuestion(body.question ?? "") };
  }
}
