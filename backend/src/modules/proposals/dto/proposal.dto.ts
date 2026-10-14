import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProposalStatus } from '../../../common/types';

export class CreateProposalDto {
  @ApiProperty({ example: 'src_billing_refunds' })
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiProperty({ example: 'Customer Refund & Cancellation Terms' })
  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ApiProperty({
    example: 'Clarify credit card turnaround timeline to 3-5 business days',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Evaluation run revealed customer confusion; current documentation omits weekend settlement delays.',
  })
  @IsString()
  @IsNotEmpty()
  rationale: string;

  @ApiProperty({
    example:
      'Refunds are processed within 3 to 5 business days following formal authorization.',
  })
  @IsString()
  @IsNotEmpty()
  currentSnippet: string;

  @ApiProperty({
    example:
      'Refunds are processed within 3 to 5 business days (excluding bank holidays and weekends).',
  })
  @IsString()
  @IsNotEmpty()
  proposedSnippet: string;

  @ApiPropertyOptional({ example: 'run_candidate_01' })
  @IsString()
  @IsOptional()
  triggerRunId?: string;

  @ApiPropertyOptional({ example: 'tc_refund_time_01' })
  @IsString()
  @IsOptional()
  triggerCaseId?: string;

  @ApiPropertyOptional({ example: 'agent-qa-proposer' })
  @IsString()
  @IsOptional()
  proposedBy?: string = 'agent-qa-proposer';
}

export class ReviewProposalDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED', 'IN_REVIEW'],
    example: 'APPROVED',
  })
  @IsEnum(['APPROVED', 'REJECTED', 'IN_REVIEW'])
  status: ProposalStatus;

  @ApiProperty({
    example: 'Audited and verified with billing finance operations team.',
  })
  @IsString()
  @IsNotEmpty()
  reviewComment: string;

  @ApiProperty({ example: 'lead-doc-reviewer@company.com' })
  @IsString()
  @IsNotEmpty()
  reviewedBy: string;
}
