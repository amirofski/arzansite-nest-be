import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class ExecuteFunctionDto {
  @ApiProperty({ description: 'Function ID to execute' })
  @IsString()
  functionId: string;

  @ApiPropertyOptional({ description: 'Data to pass to the function' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Execute function asynchronously' })
  @IsOptional()
  @IsBoolean()
  xAsync?: boolean;
}

export class FunctionExecutionResponseDto {
  @ApiProperty({ description: 'Execution ID' })
  $id: string;

  @ApiProperty({ description: 'Function ID' })
  functionId: string;

  @ApiProperty({ description: 'Execution status' })
  status: string;

  @ApiProperty({ description: 'Execution creation date' })
  $createdAt: string;
}
