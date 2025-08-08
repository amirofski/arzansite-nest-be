import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async signOut(@Request() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.signOut(token);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(@User() user: UserPayload) {
    return this.authService.getMe(user.id);
  }
}
