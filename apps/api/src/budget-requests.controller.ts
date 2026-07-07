import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { BudgetRequestsService } from "./budget-requests.service";
import { CreateBudgetRequestDto, CreateTimelineDto, RequestStatus } from "./types";

@Controller()
export class BudgetRequestsController {
  constructor(private readonly service: BudgetRequestsService) {}

  @Get("health")
  health() {
    return { ok: true };
  }

  @Get("specialties")
  getSpecialties() {
    return this.service.getSpecialties();
  }

  @Post("specialties")
  createSpecialty(@Body() body: { name: string; color?: string }) {
    return this.service.createSpecialty({ name: body.name, color: body.color ?? "#0f766e" });
  }

  @Get("companies")
  getCompanies() {
    return this.service.getCompanies();
  }

  @Post("companies")
  createCompany(@Body() body: { name: string; contact?: string }) {
    return this.service.createCompany({ name: body.name, contact: body.contact ?? "" });
  }

  @Get("requests")
  getRequests() {
    return this.service.getRequests();
  }

  @Post("requests")
  createRequest(@Body() body: CreateBudgetRequestDto) {
    return this.service.createRequest(body);
  }

  @Patch("requests/:id/status")
  updateStatus(@Param("id") requestId: string, @Body() body: { status: RequestStatus }) {
    return this.service.updateStatus(requestId, body.status);
  }

  @Post("requests/:id/timeline")
  addTimeline(@Param("id") requestId: string, @Body() body: CreateTimelineDto) {
    return this.service.addTimelineEvent(requestId, body);
  }
}
