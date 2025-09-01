import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DesignsService } from './designs.service';
import { SaveDesignDto, UpdateDesignOptionsDto, UpdatePreviewUrlDto } from './dto/design.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('orders/:order_id/design')
@UseGuards(JwtGuard)
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Post()
  async saveDesign(
    @User() user: UserPayload,
    @Param('order_id') order_id: string,
    @Body() saveDesignDto: SaveDesignDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.saveDesign(order_id, user.id, saveDesignDto, isAdmin);
  }

  @Get()
  async getDesign(
    @User() user: UserPayload,
    @Param('order_id') order_id: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.getDesign(order_id, user.id, isAdmin);
  }

  @Get('options')
  async getDesignOptions(
    @User() user: UserPayload,
    @Param('order_id') order_id: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.getDesignOptions(order_id, user.id, isAdmin);
  }

  @Patch('options')
  async updateDesignOptions(
    @User() user: UserPayload,
    @Param('order_id') order_id: string,
    @Body() updateDesignOptionsDto: UpdateDesignOptionsDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.updateDesignOptions(order_id, user.id, updateDesignOptionsDto, isAdmin);
  }

  @Patch('preview-url')
  async updatePreviewUrl(
    @User() user: UserPayload,
    @Param('order_id') order_id: string,
    @Body() updatePreviewUrlDto: UpdatePreviewUrlDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.updatePreviewUrl(order_id, user.id, updatePreviewUrlDto, isAdmin);
  }
}
