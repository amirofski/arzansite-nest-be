import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AppwriteModule } from '../appwrite/appwrite.module';
import { EmailModule } from '../email/email.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [AppwriteModule, EmailModule, ProfilesModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
