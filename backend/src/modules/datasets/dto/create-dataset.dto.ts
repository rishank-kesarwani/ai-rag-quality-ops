import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExpectedCitationDto {
  @ApiProperty({ example: 'doc-refund-policy-v2' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiPropertyOptional({ example: 'doc-refund-policy-v2#chunk-01' })
  @IsString()
  @IsOptional()
  chunkId?: string;

  @ApiPropertyOptional({ example: 'docs/billing/refunds.md' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 'processed within 3 to 5 business days' })
  @IsString()
  @IsOptional()
  quoteSnippet?: string;
}

export class TestCaseDto {
  @ApiPropertyOptional({ example: 'tc_refund_time_01' })
  @IsString()
  @IsOptional()
  caseId?: string;

  @ApiProperty({
    example: 'What is the refund turnaround time for credit card transactions?',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    example: 'Credit card refunds are processed within 3 to 5 business days.',
  })
  @IsString()
  @IsNotEmpty()
  expectedAnswer: string;

  @ApiPropertyOptional({ example: ['doc-refund-policy-v2'] })
  @IsArray()
  @IsOptional()
  relevantDocumentIds?: string[];

  @ApiPropertyOptional({ example: ['doc-refund-policy-v2#chunk-01'] })
  @IsArray()
  @IsOptional()
  relevantChunkIds?: string[];

  @ApiPropertyOptional({ type: [ExpectedCitationDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpectedCitationDto)
  expectedCitations?: ExpectedCitationDto[];

  @ApiProperty({
    example: true,
    description: 'Flag whether chunk/doc relevance ground truth is provided',
  })
  @IsBoolean()
  hasRelevanceLabels: boolean;

  @ApiPropertyOptional({ example: ['billing', 'support'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class CreateDatasetDto {
  @ApiProperty({ example: 'Customer Support Policy Benchmark' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      'Evaluates retrieval recall and citation precision for customer billing questions',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: '1.0.0', default: '1.0.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({
    example: true,
    description: 'Clearly labels whether dataset contains synthetic data',
  })
  @IsBoolean()
  isSynthetic: boolean;

  @ApiPropertyOptional({ example: ['support', 'billing', 'v1'] })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ type: [TestCaseDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases?: TestCaseDto[];
}

export class CreateVersionDto {
  @ApiProperty({ example: '1.1.0' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({ example: 'Added 5 new rate limiting test cases' })
  @IsString()
  @IsOptional()
  description?: string;
}
