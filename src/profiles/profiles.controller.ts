import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('profiles')
@UseGuards(JwtGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  async getMyProfile(@User() user: UserPayload) {
    return this.profilesService.getProfile(user.id);
  }

  @Patch('me')
  async updateMyProfile(
    @User() user: UserPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(user.id, updateProfileDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllProfiles() {
    return this.profilesService.getAllProfiles();
  }
}
