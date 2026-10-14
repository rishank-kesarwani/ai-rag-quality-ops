import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateKnowledgeSourceDto {
  @ApiProperty({ example: 'Customer Refund & Cancellation Terms' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ['DOCUMENT', 'URL', 'API_SPEC', 'MARKDOWN'],
    example: 'DOCUMENT',
  })
  @IsEnum(['DOCUMENT', 'URL', 'API_SPEC', 'MARKDOWN'])
  sourceType: 'DOCUMENT' | 'URL' | 'API_SPEC' | 'MARKDOWN';

  @ApiProperty({
    example: 'https://docs.example.com/billing/refunds.md',
    description: 'Document URI or URL (SSRF validated)',
  })
  @IsString()
  @IsNotEmpty()
  uri: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  version?: number = 1;

  @ApiPropertyOptional({
    example: 168,
    default: 168,
    description:
      'Threshold in hours before source is flagged as stale (default: 7 days)',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(8760)
  staleThresholdHours?: number = 168;

  @ApiPropertyOptional({
    example: 'Credit card refunds are processed within 3 to 5 business days...',
    description: 'Initial text content snippet for drift hashing',
  })
  @IsString()
  @IsOptional()
  contentSnippet?: string;
}

export class CheckFreshnessDto {
  @ApiPropertyOptional({
    example: 'Updated refund policy section 2.1...',
    description: 'New content to check for drift against recorded hash',
  })
  @IsString()
  @IsOptional()
  newContent?: string;
}
