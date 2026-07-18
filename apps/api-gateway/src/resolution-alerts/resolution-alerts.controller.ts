import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ResolutionAlertsService } from './resolution-alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('resolution-alerts')
export class ResolutionAlertsController {
  constructor(private readonly resolutionAlertsService: ResolutionAlertsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createAlert(@Request() req: any, @Body() body: any) {
    return this.resolutionAlertsService.createAlert(req.user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listAlerts(@Request() req: any) {
    return this.resolutionAlertsService.listAlerts(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async toggleAlert(@Request() req: any, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.resolutionAlertsService.toggleAlert(req.user.sub, id, isActive);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteAlert(@Request() req: any, @Param('id') id: string) {
    return this.resolutionAlertsService.deleteAlert(req.user.sub, id);
  }

  // Internal endpoint for the worker
  @Post('trigger-evaluation')
  async triggerEvaluation(@Body('resolutionId') resolutionId: string) {
    return this.resolutionAlertsService.evaluateNewResolution(resolutionId);
  }
}
