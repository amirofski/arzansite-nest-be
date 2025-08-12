import { Controller, Post, Headers, Body, BadRequestException, HttpCode, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../common/guards/jwt.guard';
import { AppwriteService } from './appwrite.service';
import { ExecuteFunctionDto, FunctionExecutionResponseDto } from './dto/functions.dto';

@ApiTags('functions')
@Controller('functions')
export class AppwriteFunctionsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly appwriteService: AppwriteService,
  ) {}

  @Post('execute')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Execute function',
    description: 'Execute an Appwrite cloud function with optional data payload',
  })
  @ApiBody({ type: ExecuteFunctionDto })
  @ApiResponse({
    status: 200,
    description: 'Function executed successfully',
    type: FunctionExecutionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async executeFunction(@Body() executeFunctionDto: ExecuteFunctionDto): Promise<FunctionExecutionResponseDto> {
    try {
      const response = await this.appwriteService.executeFunction(
        executeFunctionDto.functionId,
        executeFunctionDto.data,
        executeFunctionDto.xAsync,
      );
      return response as FunctionExecutionResponseDto;
    } catch (error) {
      throw new BadRequestException(`Failed to execute function: ${error.message}`);
    }
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook handler',
    description: 'Handle Appwrite webhook events',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Headers('x-appwrite-webhook') signature: string,
    @Headers('x-appwrite-event') event: string,
    @Body() payload: any,
  ) {
    const expected = this.configService.get<string>('APPWRITE_WEBHOOK_SECRET');
    if (!expected || signature !== expected) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Basic router for events – extend as needed
    switch (event) {
      // e.g. 'databases.*.collections.*.documents.*.create'
      default:
        break;
    }

    return { ok: true };
  }
}


