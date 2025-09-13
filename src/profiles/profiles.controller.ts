import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { StorageService } from '../storage/storage.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateProfileDto } from './dto/profile.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtGuard)
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly storageService: StorageService,
    private readonly appwriteService: AppwriteService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile', description: 'Returns the profile document from user_profiles for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getMyProfile(@User() user: UserPayload) {
    return this.profilesService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile', description: 'Updates fields in user_profiles for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateMyProfile(
    @User() user: UserPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(user.id, updateProfileDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all profiles (admin)', description: 'Admin-only list of profiles in users collection' })
  @ApiResponse({ status: 200, description: 'Profiles listed successfully' })
  async getAllProfiles() {
    return this.profilesService.getAllProfiles();
  }

  @Patch('me/avatar')
  @ApiOperation({ summary: 'Upload avatar for current user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] }
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded and profile updated', schema: { example: { success: true, avatar_url: 'https://.../avatars/file_id/view?project=...' } } })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = new Set(['image/png','image/jpeg','image/webp']);
      if (!allowed.has(file.mimetype)) return cb(new Error('Invalid image type'), false);
      cb(null, true);
    }
  }))
  async uploadAvatar(@User() user: UserPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const cfg = this.appwriteService.getConfig() as any;
    const bucketId = cfg.storage?.userAvatars || cfg.buckets?.avatars || process.env.APPWRITE_STORAGE_USER_AVATARS || process.env.APPWRITE_BUCKET_AVATARS;
    if (!bucketId) throw new BadRequestException('Avatar bucket not configured. Set APPWRITE_STORAGE_USER_AVATARS or APPWRITE_BUCKET_AVATARS.');
    try {
      const uploaded = await this.storageService.uploadFile(bucketId, file, null, user.id, 'avatar');
      const url = uploaded.url;
      await this.profilesService.updateProfile(user.id, { avatar_url: url });
      return { success: true, avatar_url: url };
    } catch (e: any) {
      throw new InternalServerErrorException(`Avatar upload failed: ${e?.message || 'unknown error'}`);
    }
  }
}
