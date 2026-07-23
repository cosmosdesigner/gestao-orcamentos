import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { BudgetRequestsService } from "./budget-requests.service";
import { CreateProjectDto, UpdateProjectDto } from "./types";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly service: BudgetRequestsService) {}

  @Get()
  getProjects() {
    return this.service.getProjects();
  }

  @Post()
  createProject(@Body() body: CreateProjectDto) {
    return this.service.createProject(body);
  }

  @Get(":id")
  getProject(@Param("id") projectId: string) {
    return this.service.getProjectWithRequests(projectId);
  }

  @Patch(":id")
  updateProject(@Param("id") projectId: string, @Body() body: UpdateProjectDto) {
    return this.service.updateProject(projectId, body);
  }

  @Delete(":id")
  deleteProject(@Param("id") projectId: string) {
    return this.service.deleteProject(projectId);
  }
}
