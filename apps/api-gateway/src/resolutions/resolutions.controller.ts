import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';

@Controller('resolutions')
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.resolutionsService.findAll(p, l);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.resolutionsService.findOne(id);
  }
}
