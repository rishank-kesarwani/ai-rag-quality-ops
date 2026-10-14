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
import { RetrievalMethod } from '../../../common/types';

export class RunEvaluationDto {
  @ApiProperty({
    example: 'ds_cust_support',
    description: 'Target dataset identifier',
  })
  @IsString()
  @IsNotEmpty()
  datasetId: string;

  @ApiProperty({
    example: 'Candidate: BGE Reranker + Semantic Chunking',
    description: 'Label for candidate configuration',
  })
  @IsString()
  @IsNotEmpty()
  candidateLabel: string;

  @ApiPropertyOptional({
    enum: ['DENSE', 'SPARSE_BM25', 'HYBRID', 'RERANKED'],
    default: 'HYBRID',
    description: 'Retrieval method to benchmark',
  })
  @IsEnum(['DENSE', 'SPARSE_BM25', 'HYBRID', 'RERANKED'])
  @IsOptional()
  retrievalMethod?: RetrievalMethod = 'HYBRID';

  @ApiPropertyOptional({
    example: 5,
    default: 5,
    description: 'Top K chunks to retrieve',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  topK?: number = 5;

  @ApiPropertyOptional({
    example: 0.5,
    default: 0.5,
    description: 'Minimum similarity threshold',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  minScore?: number = 0.5;

  @ApiPropertyOptional({
    example: 'run_baseline_01',
    description: 'Baseline run ID for side-by-side regression comparison',
  })
  @IsString()
  @IsOptional()
  baselineRunId?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Designate this run as an authoritative baseline',
  })
  @IsOptional()
  setAsBaseline?: boolean = false;
}
