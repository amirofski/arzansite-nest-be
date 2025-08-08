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

@Controller('orders/:orderId/design')
@UseGuards(JwtGuard)
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Post()
  async saveDesign(
    @User() user: UserPayload,
    @Param('orderId') orderId: string,
    @Body() saveDesignDto: SaveDesignDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.saveDesign(orderId, user.id, saveDesignDto, isAdmin);
  }

  @Get()
  async getDesign(
    @User() user: UserPayload,
    @Param('orderId') orderId: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.getDesign(orderId, user.id, isAdmin);
  }

  @Get('options')
  async getDesignOptions(
    @User() user: UserPayload,
    @Param('orderId') orderId: string,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.getDesignOptions(orderId, user.id, isAdmin);
  }

  @Patch('options')
  async updateDesignOptions(
    @User() user: UserPayload,
    @Param('orderId') orderId: string,
    @Body() updateDesignOptionsDto: UpdateDesignOptionsDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.updateDesignOptions(orderId, user.id, updateDesignOptionsDto, isAdmin);
  }

  @Patch('preview-url')
  async updatePreviewUrl(
    @User() user: UserPayload,
    @Param('orderId') orderId: string,
    @Body() updatePreviewUrlDto: UpdatePreviewUrlDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.designsService.updatePreviewUrl(orderId, user.id, updatePreviewUrlDto, isAdmin);
  }
}
