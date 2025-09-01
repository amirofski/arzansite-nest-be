import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthServiceMinimal {
  constructor(
    private appwriteService: AppwriteService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async resetPassword(token: string, newPassword: string, email?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 resetPassword called with:', { token: token ? '***' : 'undefined', email, newPassword: newPassword ? '***' : 'undefined' });
      
      // If email is not provided, try to derive it from the token
      let userEmail = email;
      if (!userEmail) {
        console.log('📧 Email not provided, deriving from token...');
        const resetRecord = await this.findPasswordResetRecordByToken(token);
        if (resetRecord) {
          userEmail = resetRecord.email;
          console.log('📧 Email derived from token:', userEmail);
        }
      }
      
      if (!userEmail) {
        console.log('❌ No email available for password reset');
        throw new BadRequestException('Email is required for password reset');
      }

      console.log('🔍 Validating password reset token...');
      
      // Validate token and get reset record
      const resetRecord = await this.validatePasswordResetToken(token, userEmail);
      
      if (!resetRecord) {
        console.log('❌ Invalid or expired reset token');
        throw new BadRequestException('Invalid or expired reset token');
      }

      console.log('✅ Token validated successfully');

      // Get user ID from the reset record
      const user_id = resetRecord.user_id;
      if (!user_id) {
        console.log('❌ Missing user ID in reset record');
        throw new BadRequestException('Invalid reset token: missing user ID');
      }

      console.log('👤 User ID found:', user_id);

      // Update user password in Appwrite using the Users API
      try {
        console.log('🔑 Attempting to update password...');
        
        // Use the Users API to update the password
        const success = await this.updateUserPasswordInAppwrite(userEmail, newPassword);
        
        if (!success) {
          console.log('❌ Failed to update password in Appwrite');
          throw new BadRequestException('Failed to update password in Appwrite');
        }

        console.log('✅ Password updated successfully, marking token as used...');

        // Mark the reset token as used
        await this.markPasswordResetTokenAsUsed(token);
        
        console.log('✅ Token marked as used, returning success');
        
        return {
          success: true,
          message: 'Password has been successfully reset. You can now log in with your new password.'
        };
      } catch (error) {
        console.error('❌ Failed to update password:', error);
        throw new BadRequestException('Failed to update password');
      }
    } catch (error) {
      console.error('❌ Password reset validation error:', error);
      throw new BadRequestException(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Update user password directly in Appwrite using the Users API
   */
  private async updateUserPasswordInAppwrite(email: string, newPassword: string): Promise<boolean> {
    try {
      console.log('🔧 updateUserPasswordInAppwrite called with:', { email, newPassword: newPassword ? '***' : 'undefined' });
      
      // Use the Users API to find and update the user
      const { Query } = await import('node-appwrite');
      
      console.log('🔍 Searching for user by email...');
      
      // Find user by email using the Users API
      const users = await this.appwriteService.getUsers().list([
        Query.equal('email', email)
      ]);
      
      console.log('📊 Users found:', users.users.length);
      
      if (users.users.length === 0) {
        console.log('❌ User not found by email');
        throw new Error('User not found');
      }
      
      const user = users.users[0];
      console.log('✅ User found:', { user_id: user.$id, email: user.email });
      
      console.log('🔑 Attempting to update password...');
      
      // Update the user's password using the Users API
      await this.appwriteService.getUsers().updatePassword(user.$id, newPassword);
      
      console.log('✅ Password updated successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to update password in Appwrite:', error);
      return false;
    }
  }

  private async findPasswordResetRecordByToken(token: string): Promise<any> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PASSWORD_RESETS');
      
      if (!databaseId || !collectionId) {
        return null;
      }

      const { Query } = await import('node-appwrite');
      
      // Find the reset record by token only
      const resetRecords = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [Query.equal('token', token)]
      );

      if (resetRecords.documents.length === 0) {
        return null;
      }

      return resetRecords.documents[0];
    } catch (error) {
      console.error('Failed to find password reset record by token:', error);
      return null;
    }
  }

  private async validatePasswordResetToken(token: string, email: string): Promise<any> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PASSWORD_RESETS');
      
      if (!databaseId || !collectionId) {
        throw new Error('Missing database configuration for password resets');
      }

      const { Query } = await import('node-appwrite');
      
      // Find the reset token
      const resetRecords = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('token', token),
          Query.equal('email', email),
          Query.equal('used', false)
        ]
      );

      if (resetRecords.documents.length === 0) {
        return null;
      }

      const resetRecord = resetRecords.documents[0];
      
      // Check if token has expired
      const expiresAt = new Date(resetRecord.expiresAt);
      if (expiresAt < new Date()) {
        return null;
      }

      return resetRecord;
    } catch (error) {
      console.error('Failed to validate password reset token:', error);
      return null;
    }
  }

  private async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    try {
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_PASSWORD_RESETS');
      
      if (!databaseId || !collectionId) {
        throw new Error('Missing database configuration for password resets');
      }

      const { Query } = await import('node-appwrite');
      
      // Find the reset record
      const resetRecords = await this.appwriteService.getDatabases().listDocuments(
        databaseId,
        collectionId,
        [Query.equal('token', token)]
      );

      if (resetRecords.documents.length > 0) {
        const resetRecord = resetRecords.documents[0];
        
        // Mark as used
        await this.appwriteService.getDatabases().updateDocument(
          databaseId,
          collectionId,
          resetRecord.$id,
          { used: true }
        );
      }
    } catch (error) {
      console.error('Failed to mark password reset token as used:', error);
    }
  }
}
